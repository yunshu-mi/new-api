package controller

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/config"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStatusPublishesConfiguredICPRecord(t *testing.T) {
	settings := operation_setting.GetGeneralSetting()
	original := settings.ICPRecord
	t.Cleanup(func() { settings.ICPRecord = original })
	for _, record := range []string{"京ICP备12345678号-1", ""} {
		t.Run(record, func(t *testing.T) {
			require.NoError(t, config.GlobalConfig.LoadFromDB(map[string]string{
				"general_setting.icp_record": record,
			}))
			saved := make(map[string]string)
			require.NoError(t, config.GlobalConfig.SaveToDB(func(key, value string) error {
				saved[key] = value
				return nil
			}))
			assert.Equal(t, record, saved["general_setting.icp_record"])

			response := httptest.NewRecorder()
			context, _ := gin.CreateTestContext(response)
			context.Request = httptest.NewRequest(http.MethodGet, "/api/status", nil)
			GetStatus(context)
			require.Equal(t, http.StatusOK, response.Code)
			var payload struct {
				Success bool `json:"success"`
				Data    struct {
					ICPRecord string `json:"icp_record"`
				} `json:"data"`
			}
			require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
			require.True(t, payload.Success)
			assert.Equal(t, record, payload.Data.ICPRecord)
		})
	}
}
