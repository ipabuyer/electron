import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Divider, Stack, TextField, Typography } from '@mui/material';

const AccountPage = ({
  App_AuthState_Object,
  App_Passphrase_String,
  App_Notify_Function,
  setApp_AuthState_Object,
  setApp_Passphrase_String
}) => {
  const [AccountPage_LoginForm_Object, setAccountPage_LoginForm_Object] = useState({
    email: '',
    password: '',
    authCode: '',
    passphrase: App_Passphrase_String || ''
  });
  const [AccountPage_ActionLoading_Boolean, setAccountPage_ActionLoading_Boolean] = useState(false);
  const [AccountPage_AuthInfo_String, setAccountPage_AuthInfo_String] = useState('');

  useEffect(() => {
    setAccountPage_LoginForm_Object((prev) => ({
      ...prev,
      passphrase: prev.passphrase || App_Passphrase_String || ''
    }));
  }, [App_Passphrase_String]);

  const AccountPage_SubmitLogin_AsyncFunction = async () => {
    if (!AccountPage_LoginForm_Object.email || !AccountPage_LoginForm_Object.password || !AccountPage_LoginForm_Object.passphrase) {
      App_Notify_Function('warning', '请填写邮箱、密码与加密密钥');
      return;
    }
    setAccountPage_ActionLoading_Boolean(true);
    try {
      const res = await window.electronAPI.login(AccountPage_LoginForm_Object);
      if (res.ok) {
        setApp_AuthState_Object({
          email: AccountPage_LoginForm_Object.email,
          loggedIn: true,
          isTest: res.mock === true
        });
        setApp_Passphrase_String(AccountPage_LoginForm_Object.passphrase);
        App_Notify_Function('success', res.mock ? '测试账户登录成功' : '登录成功');
      } else {
        App_Notify_Function('error', res.stderr || res.error || '登录失败');
      }
    } catch (error) {
      App_Notify_Function('error', error.message || '登录失败');
    } finally {
      setAccountPage_ActionLoading_Boolean(false);
    }
  };

  const AccountPage_CheckAuth_AsyncFunction = async () => {
    const passphrase = AccountPage_LoginForm_Object.passphrase || App_Passphrase_String;
    if (!passphrase) {
      App_Notify_Function('warning', '请先输入加密密钥');
      return;
    }
    try {
      const res = await window.electronAPI.authInfo({ passphrase });
      if (res.ok) {
        const message = res.mock
          ? '测试账户已登录'
          : (res.stdout || res.message || '已登录');
        setAccountPage_AuthInfo_String(message);
        App_Notify_Function('info', message);
      } else {
        const message = res.stderr || res.error || '未登录';
        setAccountPage_AuthInfo_String(message);
        App_Notify_Function('warning', message);
      }
    } catch (error) {
      App_Notify_Function('error', error.message || '查询失败');
    }
  };

  const AccountPage_Logout_AsyncFunction = async () => {
    try {
      const res = await window.electronAPI.authRevoke();
      if (res.ok) {
        setApp_AuthState_Object({ email: '', loggedIn: false, isTest: false });
        App_Notify_Function('info', '已退出登录');
      } else {
        App_Notify_Function('error', res.stderr || res.error || '退出失败');
      }
    } catch (error) {
      App_Notify_Function('error', error.message || '退出失败');
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 560 }}>
      <Typography variant="h6" fontWeight={700}>账户</Typography>
      <Typography variant="body2" color="text.secondary">
        当前状态：{App_AuthState_Object.loggedIn ? `已登录（${App_AuthState_Object.email}）` : '未登录'}
      </Typography>
      <Divider />
      <Stack spacing={2}>
        <TextField
          label="邮箱"
          fullWidth
          value={AccountPage_LoginForm_Object.email}
          onChange={(e) =>
            setAccountPage_LoginForm_Object({ ...AccountPage_LoginForm_Object, email: e.target.value })
          }
        />
        <TextField
          label="密码"
          type="password"
          fullWidth
          value={AccountPage_LoginForm_Object.password}
          onChange={(e) =>
            setAccountPage_LoginForm_Object({ ...AccountPage_LoginForm_Object, password: e.target.value })
          }
        />
        <TextField
          label="双重验证码（可选）"
          fullWidth
          value={AccountPage_LoginForm_Object.authCode}
          onChange={(e) =>
            setAccountPage_LoginForm_Object({ ...AccountPage_LoginForm_Object, authCode: e.target.value })
          }
          helperText="可先只输入邮箱+密码获取验证码，再输入验证码登录"
        />
        <TextField
          label="加密密钥（keychain passphrase）"
          fullWidth
          value={AccountPage_LoginForm_Object.passphrase}
          onChange={(e) => {
            setAccountPage_LoginForm_Object({ ...AccountPage_LoginForm_Object, passphrase: e.target.value });
            setApp_Passphrase_String(e.target.value);
          }}
          helperText="修改密钥需先退出登录并重新登录"
        />
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center">
        <Button variant="contained" onClick={AccountPage_SubmitLogin_AsyncFunction} disabled={AccountPage_ActionLoading_Boolean}>
          登录
        </Button>
        <Button variant="outlined" onClick={AccountPage_CheckAuth_AsyncFunction}>
          查询登录状态
        </Button>
        <Button variant="text" onClick={AccountPage_Logout_AsyncFunction}>
          退出登录
        </Button>
      </Stack>
      {AccountPage_AuthInfo_String && (
        <Typography variant="body2" color="text.secondary">
          状态信息：{AccountPage_AuthInfo_String}
        </Typography>
      )}
      <Alert severity="info" variant="outlined">
        测试账户：test / test（购买或下载会直接成功，仅用于界面测试）。新创建的苹果账号必须先在设备 App Store 完成一次购买后才能用于本软件。
        如收不到验证码，请打开 https://account.apple.com/ 获取双重验证码后填入本软件。
      </Alert>
      <Typography variant="caption" color="text.secondary">
        注意：只有 ipatool 处于登录状态时才存在加密密钥。
      </Typography>
    </Box>
  );
};

export default AccountPage;
