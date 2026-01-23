import React, { useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';

const SettingPage = ({
  App_CountryCode_String,
  App_DeveloperSite_String,
  App_Notify_Function,
  setApp_CountryCode_String,
  setApp_DeveloperSite_String,
  setApp_StatusRefreshSeed_Number
}) => {
  const [SettingPage_ClearOpen_Boolean, setSettingPage_ClearOpen_Boolean] = useState(false);

  const SettingPage_NormalizeCountryCode_Function = (value) =>
    value.replace(/[^a-zA-Z]/g, '').slice(0, 2).toLowerCase();

  const SettingPage_ClearDatabase_AsyncFunction = async () => {
    try {
      const res = await window.electronAPI.clearDatabase();
      if (res?.ok) {
        setApp_StatusRefreshSeed_Number((prev) => prev + 1);
        App_Notify_Function('success', '本地数据库已清空');
      } else {
        App_Notify_Function('error', res?.error || '清空失败');
      }
    } catch (error) {
      App_Notify_Function('error', error.message || '清空失败');
    } finally {
      setSettingPage_ClearOpen_Boolean(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 480 }}>
      <Typography variant="h6" fontWeight={700}>设置</Typography>
      <Stack spacing={2}>
        <TextField
          label="国家代码（ISO 3166-1 Alpha-2）"
          value={App_CountryCode_String}
          onChange={(e) => setApp_CountryCode_String(SettingPage_NormalizeCountryCode_Function(e.target.value))}
          helperText="默认：cn"
        />
        <TextField
          label="开发者官方网站"
          value={App_DeveloperSite_String}
          onChange={(e) => setApp_DeveloperSite_String(e.target.value)}
          helperText="默认：ipa.blazesnow.com"
        />
      </Stack>
      <Button variant="outlined" color="error" onClick={() => setSettingPage_ClearOpen_Boolean(true)}>
        清空本地数据库
      </Button>

      <Dialog open={SettingPage_ClearOpen_Boolean} onClose={() => setSettingPage_ClearOpen_Boolean(false)}>
        <DialogTitle>确认清空数据库</DialogTitle>
        <DialogContent>
          <Typography variant="body2">清空后已购买/已拥有记录将被移除，是否继续？</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingPage_ClearOpen_Boolean(false)}>取消</Button>
          <Button variant="contained" color="error" onClick={SettingPage_ClearDatabase_AsyncFunction}>
            确认清空
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SettingPage;
