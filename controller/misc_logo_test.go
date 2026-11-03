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
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStatusReturnsIndependentLightAndDarkLogos(t *testing.T) {
	settings := operation_setting.GetGeneralSetting()
	originalLight, originalDark := common.Logo, settings.LogoDark
	t.Cleanup(func() { common.Logo, settings.LogoDark = originalLight, originalDark })
	common.Logo = "https://example.com/light.png"
	for _, dark := range []string{"https://example.com/dark.webp", ""} {
		t.Run(dark, func(t *testing.T) {
			// 配置通过现有键值存储加载和导出，浅色 Logo 不受深色配置影响。
			require.NoError(t, config.GlobalConfig.LoadFromDB(map[string]string{"general_setting.logo_dark": dark}))
			saved := make(map[string]string)
			require.NoError(t, config.GlobalConfig.SaveToDB(func(key, value string) error {
				saved[key] = value
				return nil
			}))
			assert.Equal(t, dark, saved["general_setting.logo_dark"])
			response := httptest.NewRecorder()
			context, _ := gin.CreateTestContext(response)
			context.Request = httptest.NewRequest(http.MethodGet, "/api/status", nil)
			GetStatus(context)
			var payload struct {
				Success bool `json:"success"`
				Data    struct {
					Logo     string `json:"logo"`
					LogoDark string `json:"logo_dark"`
				} `json:"data"`
			}
			require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
			require.True(t, payload.Success)
			assert.Equal(t, common.Logo, payload.Data.Logo)
			assert.Equal(t, dark, payload.Data.LogoDark)
		})
	}
}

func TestLogoImageValidation(t *testing.T) {
	var imageBytes bytes.Buffer
	require.NoError(t, png.Encode(&imageBytes, image.NewRGBA(image.Rect(0, 0, 2, 2))))
	pngData := base64.StdEncoding.EncodeToString(imageBytes.Bytes())
	// 有效的 1×1 WebP 图片，同时覆盖服务端对 WebP 格式的识别。
	webpData := "UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA"
	for _, value := range []string{"", "/logo.png", "https://example.com/logo.png", "data:image/png;base64," + pngData, "data:image/webp;base64," + webpData} {
		assert.NoError(t, operation_setting.ValidateLogoImage(value))
	}

	for _, key := range []string{"Logo", "general_setting.logo_dark"} {
		for _, tc := range []struct {
			name, value string
		}{
			{"unsupported format", "data:image/svg+xml;base64,PHN2Zy8+"},
			{"missing separator", "data:image/png;base64"},
			{"invalid base64", "data:image/png;base64,***"},
			{"empty image", "data:image/png;base64,"},
			{"invalid image", "data:image/png;base64,bm90LWFuLWltYWdl"},
			{"wrong image type", "data:image/webp;base64," + pngData},
			{"oversized image", "data:image/png;base64," + strings.Repeat("A", base64.StdEncoding.EncodedLen(100*1024)+4)},
		} {
			t.Run(key+"/"+tc.name, func(t *testing.T) {
				body, err := common.Marshal(OptionUpdateRequest{Key: key, Value: tc.value})
				require.NoError(t, err)
				response := httptest.NewRecorder()
				context, _ := gin.CreateTestContext(response)
				context.Request = httptest.NewRequest(http.MethodPut, "/api/option/", bytes.NewReader(body))
				UpdateOption(context)
				var payload struct {
					Success bool `json:"success"`
					Message any  `json:"message"`
				}
				require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
				assert.False(t, payload.Success)
				assert.NotEmpty(t, payload.Message)
			})
		}
	}
}
