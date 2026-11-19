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
	CustomerSupportContact
	SecondContact CustomerSupportContact `json:"second_contact"`
}

type CustomerSupportContact struct {
	Name   string `json:"name"`
	Phone  string `json:"phone"`
	WeChat string `json:"wechat"`
	QRCode string `json:"qr_code"`
}

// UnmarshalJSON 替换整份配置，避免读取旧格式时保留上一次加载的第二组客服。
func (c *CustomerSupportConfig) UnmarshalJSON(data []byte) error {
	type wireConfig CustomerSupportConfig
	var next wireConfig
	if err := common.Unmarshal(data, &next); err != nil {
		return err
	}
	*c = CustomerSupportConfig(next)
	return nil
}

// PublicConfig 避免在公共状态响应中重复传输二维码文件；关闭时不公开联系方式。
func (c CustomerSupportConfig) PublicConfig() CustomerSupportConfig {
	if !c.Enabled {
		return CustomerSupportConfig{}
	}
	if c.QRCode != "" {
		c.QRCode = fmt.Sprintf("/api/customer-support/qr-code?v=%x", sha256.Sum256([]byte(c.QRCode)))
	}
	if c.SecondContact.QRCode != "" {
		c.SecondContact.QRCode = fmt.Sprintf("/api/customer-support/qr-code?contact=2&v=%x", sha256.Sum256([]byte(c.SecondContact.QRCode)))
	}
	return c
}

func ValidateCustomerSupport(value string) error {
	if len(value) > 2*base64.StdEncoding.EncodedLen(MaxCustomerSupportImageBytes)+16384 {
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
		utf8.RuneCountInString(settings.Description) > 1000 {
		return common.NewMessage("Customer support text exceeds the length limit")
	}
	for _, contact := range [2]CustomerSupportContact{settings.CustomerSupportContact, settings.SecondContact} {
		if utf8.RuneCountInString(contact.Name) > 100 ||
			utf8.RuneCountInString(contact.Phone) > 100 ||
			utf8.RuneCountInString(contact.WeChat) > 100 {
			return common.NewMessage("Customer support text exceeds the length limit")
		}
		if contact.QRCode != "" {
			if _, _, err := DecodeCustomerSupportQRCode(contact.QRCode); err != nil {
				return err
			}
		}
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
