package controller

import (
	"crypto/sha256"
	"fmt"
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/console_setting"
	"github.com/gin-gonic/gin"
)

func GetCustomerSupportQRCode(c *gin.Context) {
	common.OptionMapRWMutex.RLock()
	settings := console_setting.GetConsoleSetting().CustomerSupport
	common.OptionMapRWMutex.RUnlock()
	if !settings.Enabled || settings.QRCode == "" {
		c.Status(http.StatusNotFound)
		return
	}
	data, mimeType, err := console_setting.DecodeCustomerSupportQRCode(settings.QRCode)
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	etag := fmt.Sprintf(`"%x"`, sha256.Sum256(data))
	c.Header("ETag", etag)
	c.Header("Cache-Control", "no-cache")
	c.Header("X-Content-Type-Options", "nosniff")
	if c.GetHeader("If-None-Match") == etag {
		c.Status(http.StatusNotModified)
		return
	}
	c.Data(http.StatusOK, mimeType, data)
}
