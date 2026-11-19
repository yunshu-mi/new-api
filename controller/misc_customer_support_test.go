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

func supportQRCodeFixture(t *testing.T, size int) (string, []byte) {
	t.Helper()
	var buffer bytes.Buffer
	require.NoError(t, png.Encode(&buffer, image.NewRGBA(image.Rect(0, 0, size, size))))
	data := buffer.Bytes()
	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(data), data
}

func TestCustomerSupportStatusAndQRCode(t *testing.T) {
	settings := console_setting.GetConsoleSetting()
	original := settings.CustomerSupport
	t.Cleanup(func() { settings.CustomerSupport = original })
	qrCode, imageBytes := supportQRCodeFixture(t, 2)
	secondQRCode, secondImageBytes := supportQRCodeFixture(t, 3)
	configured := console_setting.CustomerSupportConfig{
		Enabled: true, Title: "联系客服", Description: "服务时间 9:00–18:00",
		CustomerSupportContact: console_setting.CustomerSupportContact{Name: "Support", Phone: "123456", WeChat: "support-team", QRCode: qrCode},
		SecondContact:          console_setting.CustomerSupportContact{Name: "Support 2", Phone: "654321", WeChat: "support-team-2", QRCode: secondQRCode},
	}
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
	expectedPublic.SecondContact.QRCode = payload.Data.Support.SecondContact.QRCode
	assert.Equal(t, expectedPublic, payload.Data.Support)
	assert.True(t, strings.HasPrefix(payload.Data.Support.QRCode, "/api/customer-support/qr-code?v="))
	assert.True(t, strings.HasPrefix(payload.Data.Support.SecondContact.QRCode, "/api/customer-support/qr-code?contact=2&v="))
	assert.NotContains(t, status.Body.String(), qrCode)
	assert.NotContains(t, status.Body.String(), secondQRCode)

	router := gin.New()
	router.GET("/api/customer-support/qr-code", GetCustomerSupportQRCode)
	for _, contact := range []struct {
		url  string
		data []byte
	}{
		{url: payload.Data.Support.QRCode, data: imageBytes},
		{url: payload.Data.Support.SecondContact.QRCode, data: secondImageBytes},
	} {
		response := httptest.NewRecorder()
		router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, contact.url, nil))
		require.Equal(t, http.StatusOK, response.Code)
		assert.Equal(t, contact.data, response.Body.Bytes())
		assert.Equal(t, "image/png", response.Header().Get("Content-Type"))
		assert.Equal(t, "nosniff", response.Header().Get("X-Content-Type-Options"))

		cached := httptest.NewRecorder()
		request := httptest.NewRequest(http.MethodGet, contact.url, nil)
		request.Header.Set("If-None-Match", response.Header().Get("ETag"))
		router.ServeHTTP(cached, request)
		assert.Equal(t, http.StatusNotModified, cached.Code)
	}

	settings.CustomerSupport.Enabled = false
	assert.Equal(t, console_setting.CustomerSupportConfig{}, settings.CustomerSupport.PublicConfig())
	assert.Equal(t, qrCode, settings.CustomerSupport.QRCode)
	assert.Equal(t, secondQRCode, settings.CustomerSupport.SecondContact.QRCode)
	for _, url := range []string{payload.Data.Support.QRCode, payload.Data.Support.SecondContact.QRCode} {
		disabled := httptest.NewRecorder()
		router.ServeHTTP(disabled, httptest.NewRequest(http.MethodGet, url, nil))
		assert.Equal(t, http.StatusNotFound, disabled.Code)
	}

	const legacy = `{"enabled":true,"title":"Help","name":"Support","phone":"123456","wechat":"support-team"}`
	require.NoError(t, config.GlobalConfig.LoadFromDB(map[string]string{"console_setting.customer_support": legacy}))
	assert.Equal(t, "123456", settings.CustomerSupport.PublicConfig().Phone)
	assert.Empty(t, settings.CustomerSupport.PublicConfig().SecondContact)
	missing := httptest.NewRecorder()
	router.ServeHTTP(missing, httptest.NewRequest(http.MethodGet, payload.Data.Support.SecondContact.QRCode, nil))
	assert.Equal(t, http.StatusNotFound, missing.Code)
}

func TestCustomerSupportRejectsInvalidConfiguration(t *testing.T) {
	qrCode, _ := supportQRCodeFixture(t, 2)
	for _, test := range []struct {
		name   string
		config console_setting.CustomerSupportConfig
	}{
		{name: "missing enabled title", config: console_setting.CustomerSupportConfig{Enabled: true}},
		{name: "description too long", config: console_setting.CustomerSupportConfig{Description: strings.Repeat("字", 1001)}},
		{name: "unsupported first image", config: console_setting.CustomerSupportConfig{CustomerSupportContact: console_setting.CustomerSupportContact{QRCode: "data:image/svg+xml;base64,PHN2Zy8+"}}},
		{name: "corrupt second image", config: console_setting.CustomerSupportConfig{SecondContact: console_setting.CustomerSupportContact{QRCode: "data:image/png;base64," + base64.StdEncoding.EncodeToString([]byte("not an image"))}}},
		{name: "wrong image type", config: console_setting.CustomerSupportConfig{CustomerSupportContact: console_setting.CustomerSupportContact{QRCode: strings.Replace(qrCode, "image/png", "image/jpeg", 1)}}},
		{name: "oversized second image", config: console_setting.CustomerSupportConfig{SecondContact: console_setting.CustomerSupportContact{QRCode: "data:image/png;base64," + strings.Repeat("A", base64.StdEncoding.EncodedLen(console_setting.MaxCustomerSupportImageBytes)+4)}}},
		{name: "second phone too long", config: console_setting.CustomerSupportConfig{SecondContact: console_setting.CustomerSupportContact{Phone: strings.Repeat("1", 101)}}},
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
