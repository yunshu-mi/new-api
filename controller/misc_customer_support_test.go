package controller

import (
	"bytes"
	"encoding/base64"
	"image"
	"image/png"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/config"
	"github.com/QuantumNous/new-api/setting/console_setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func supportQRCodeFixture(t *testing.T) (string, []byte) {
	t.Helper()
	var buffer bytes.Buffer
	require.NoError(t, png.Encode(&buffer, image.NewRGBA(image.Rect(0, 0, 2, 2))))
	data := buffer.Bytes()
	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(data), data
}

func TestCustomerSupportStatusAndQRCode(t *testing.T) {
	settings := console_setting.GetConsoleSetting()
	original := settings.CustomerSupport
	t.Cleanup(func() { settings.CustomerSupport = original })
	qrCode, imageBytes := supportQRCodeFixture(t)
	configured := console_setting.CustomerSupportConfig{Enabled: true, Title: "联系客服", Description: "服务时间 9:00–18:00", Name: "Support", Phone: "123456", WeChat: "support-team", QRCode: qrCode}
	raw, err := common.Marshal(configured)
	require.NoError(t, err)
	require.NoError(t, console_setting.ValidateCustomerSupport(string(raw)))
	require.NoError(t, config.GlobalConfig.LoadFromDB(map[string]string{"console_setting.customer_support": string(raw)}))

	status := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(status)
	context.Request = httptest.NewRequest(http.MethodGet, "/api/status", nil)
	GetStatus(context)
	var payload struct {
		Success bool `json:"success"`
		Data    struct {
			Support console_setting.CustomerSupportConfig `json:"customer_support"`
		} `json:"data"`
	}
	require.NoError(t, common.Unmarshal(status.Body.Bytes(), &payload))
	require.True(t, payload.Success)
	expectedPublic := configured
	expectedPublic.QRCode = payload.Data.Support.QRCode
	assert.Equal(t, expectedPublic, payload.Data.Support)
	assert.True(t, strings.HasPrefix(payload.Data.Support.QRCode, "/api/customer-support/qr-code?v="))
	assert.NotContains(t, status.Body.String(), qrCode)

	response := httptest.NewRecorder()
	context, _ = gin.CreateTestContext(response)
	context.Request = httptest.NewRequest(http.MethodGet, payload.Data.Support.QRCode, nil)
	GetCustomerSupportQRCode(context)
	require.Equal(t, http.StatusOK, response.Code)
	assert.Equal(t, imageBytes, response.Body.Bytes())
	assert.Equal(t, "image/png", response.Header().Get("Content-Type"))
	assert.Equal(t, "nosniff", response.Header().Get("X-Content-Type-Options"))

	cached := httptest.NewRecorder()
	context, _ = gin.CreateTestContext(cached)
	context.Request = httptest.NewRequest(http.MethodGet, "/api/customer-support/qr-code", nil)
	context.Request.Header.Set("If-None-Match", response.Header().Get("ETag"))
	GetCustomerSupportQRCode(context)
	context.Writer.WriteHeaderNow()
	assert.Equal(t, http.StatusNotModified, cached.Code)

	settings.CustomerSupport.Enabled = false
	assert.Empty(t, settings.CustomerSupport.PublicConfig().Phone)
	assert.Equal(t, qrCode, settings.CustomerSupport.QRCode, "关闭入口应保留已保存的二维码")
	disabled := httptest.NewRecorder()
	context, _ = gin.CreateTestContext(disabled)
	context.Request = httptest.NewRequest(http.MethodGet, "/api/customer-support/qr-code", nil)
	GetCustomerSupportQRCode(context)
	context.Writer.WriteHeaderNow()
	assert.Equal(t, http.StatusNotFound, disabled.Code)
}

func TestCustomerSupportRejectsInvalidConfiguration(t *testing.T) {
	qrCode, _ := supportQRCodeFixture(t)
	for _, test := range []struct {
		name   string
		config console_setting.CustomerSupportConfig
	}{
		{name: "missing enabled title", config: console_setting.CustomerSupportConfig{Enabled: true}},
		{name: "description too long", config: console_setting.CustomerSupportConfig{Description: strings.Repeat("字", 1001)}},
		{name: "unsupported image", config: console_setting.CustomerSupportConfig{QRCode: "data:image/svg+xml;base64,PHN2Zy8+"}},
		{name: "corrupt image", config: console_setting.CustomerSupportConfig{QRCode: "data:image/png;base64," + base64.StdEncoding.EncodeToString([]byte("not an image"))}},
		{name: "wrong image type", config: console_setting.CustomerSupportConfig{QRCode: strings.Replace(qrCode, "image/png", "image/jpeg", 1)}},
		{name: "oversized image", config: console_setting.CustomerSupportConfig{QRCode: "data:image/png;base64," + strings.Repeat("A", base64.StdEncoding.EncodedLen(console_setting.MaxCustomerSupportImageBytes)+4)}},
	} {
		t.Run(test.name, func(t *testing.T) {
			raw, err := common.Marshal(test.config)
			require.NoError(t, err)
			body, err := common.Marshal(map[string]string{"key": "console_setting.customer_support", "value": string(raw)})
			require.NoError(t, err)
			response := httptest.NewRecorder()
			context, _ := gin.CreateTestContext(response)
			context.Request = httptest.NewRequest(http.MethodPut, "/api/option/", bytes.NewReader(body))
			context.Request.Header.Set("Content-Type", "application/json")
			UpdateOption(context)
			var payload struct {
				Success bool `json:"success"`
			}
			require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
			assert.False(t, payload.Success)
		})
	}
	require.Error(t, console_setting.ValidateCustomerSupport("not JSON"))
	require.Error(t, console_setting.ValidateCustomerSupport("null"))
}
