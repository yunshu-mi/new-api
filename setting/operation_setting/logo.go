package operation_setting

import (
	"bytes"
	"encoding/base64"
	"image"
	_ "image/png"
	"strings"

	"github.com/QuantumNous/new-api/common"
	_ "golang.org/x/image/webp"
)

// ValidateLogoImage 校验上传图片；已有 URL 和空值继续使用原有配置行为。
func ValidateLogoImage(value string) error {
	if !strings.HasPrefix(value, "data:") {
		return nil
	}
	const maxImageBytes = 100 * 1024
	invalid := common.NewMessage("Please choose a PNG or WebP image")
	header, encoded, ok := strings.Cut(value, ",")
	if !ok {
		return invalid
	}
	if len(encoded) > base64.StdEncoding.EncodedLen(maxImageBytes) {
		return common.NewMessage("Logo file must be 100 KB or smaller")
	}
	var expectedFormat string
	switch header {
	case "data:image/png;base64":
		expectedFormat = "png"
	case "data:image/webp;base64":
		expectedFormat = "webp"
	default:
		return invalid
	}
	data, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil || len(data) == 0 {
		return invalid
	}
	if len(data) > maxImageBytes {
		return common.NewMessage("Logo file must be 100 KB or smaller")
	}
	_, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil || format != expectedFormat {
		return invalid
	}
	return nil
}
