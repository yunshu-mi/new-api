package console_setting

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"strings"
	"unicode/utf8"

	"github.com/QuantumNous/new-api/common"
	_ "golang.org/x/image/webp"
)

const MaxCustomerSupportImageBytes = 5 << 20

type CustomerSupportConfig struct {
	Enabled     bool   `json:"enabled"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Name        string `json:"name"`
	Phone       string `json:"phone"`
	WeChat      string `json:"wechat"`
	QRCode      string `json:"qr_code"`
}

// PublicConfig 避免在公共状态响应中重复传输二维码文件；关闭时不公开联系方式。
func (c CustomerSupportConfig) PublicConfig() CustomerSupportConfig {
	if !c.Enabled {
		return CustomerSupportConfig{}
	}
	if c.QRCode != "" {
		c.QRCode = fmt.Sprintf("/api/customer-support/qr-code?v=%x", sha256.Sum256([]byte(c.QRCode)))
	}
	return c
}

func ValidateCustomerSupport(value string) error {
	if len(value) > base64.StdEncoding.EncodedLen(MaxCustomerSupportImageBytes)+16384 {
		return common.NewMessage("Support QR code must be a PNG, JPEG or WebP image up to 5 MB")
	}
	var settings *CustomerSupportConfig
	if err := common.UnmarshalJsonStr(value, &settings); err != nil || settings == nil {
		return common.NewMessage("Invalid customer support configuration")
	}
	if settings.Enabled && strings.TrimSpace(settings.Title) == "" {
		return common.NewMessage("Popup title is required")
	}
	if utf8.RuneCountInString(settings.Title) > 100 ||
		utf8.RuneCountInString(settings.Description) > 1000 ||
		utf8.RuneCountInString(settings.Name) > 100 ||
		utf8.RuneCountInString(settings.Phone) > 100 ||
		utf8.RuneCountInString(settings.WeChat) > 100 {
		return common.NewMessage("Customer support text exceeds the length limit")
	}
	if settings.QRCode != "" {
		_, _, err := DecodeCustomerSupportQRCode(settings.QRCode)
		return err
	}
	return nil
}

func DecodeCustomerSupportQRCode(value string) ([]byte, string, error) {
	invalid := common.NewMessage("Support QR code must be a PNG, JPEG or WebP image up to 5 MB")
	header, encoded, ok := strings.Cut(value, ",")
	if !ok || len(encoded) > base64.StdEncoding.EncodedLen(MaxCustomerSupportImageBytes) {
		return nil, "", invalid
	}
	var mimeType, format string
	switch header {
	case "data:image/png;base64":
		mimeType, format = "image/png", "png"
	case "data:image/jpeg;base64":
		mimeType, format = "image/jpeg", "jpeg"
	case "data:image/webp;base64":
		mimeType, format = "image/webp", "webp"
	default:
		return nil, "", invalid
	}
	data, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil || len(data) == 0 || len(data) > MaxCustomerSupportImageBytes {
		return nil, "", invalid
	}
	_, actualFormat, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil || actualFormat != format {
		return nil, "", invalid
	}
	return data, mimeType, nil
}
