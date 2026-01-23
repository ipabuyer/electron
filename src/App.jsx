import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Snackbar } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Sidebar from './components/Sidebar';
import CustomTitleBar from './components/CustomTitleBar';
import HomePage from './pages/HomePage';
import AccountPage from './pages/AccountPage';
import SettingPage from './pages/SettingPage';

const useSystemTheme = () => {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  return prefersDark ? 'dark' : 'light';
};

const getTheme = (mode) =>
  createTheme({
    palette: {
      mode,
      primary: { main: '#2563eb' },
      secondary: { main: '#14b8a6' },
      background: {
        default: mode === 'dark' ? '#0f1115' : '#f6f7fb',
        paper: mode === 'dark' ? '#141821' : '#ffffff'
      }
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: "'Segoe UI', 'Microsoft YaHei', system-ui, -apple-system, sans-serif"
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            border: mode === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(15,23,42,0.08)',
            backgroundImage:
              mode === 'dark'
                ? 'linear-gradient(160deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))'
                : 'linear-gradient(160deg, rgba(15,23,42,0.02), rgba(15,23,42,0.01))'
          }
        }
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 700
          }
        }
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            minHeight: 40
          }
        }
      }
    }
  });

const App = () => {
  const App_ThemeMode_String = useSystemTheme();
  const App_Theme_Object = useMemo(() => getTheme(App_ThemeMode_String), [App_ThemeMode_String]);

  const [App_ActivePage_String, setApp_ActivePage_String] = useState('home');
  const [App_CountryCode_String, setApp_CountryCode_String] = useState('cn');
  const [App_DeveloperSite_String, setApp_DeveloperSite_String] = useState('ipa.blazesnow.com');
  const [App_Passphrase_String, setApp_Passphrase_String] = useState('');
  const [App_AuthState_Object, setApp_AuthState_Object] = useState({
    email: '',
    loggedIn: false,
    isTest: false
  });
  const [App_TitleBarContent_Node, setApp_TitleBarContent_Node] = useState(null);
  const [App_StatusRefreshSeed_Number, setApp_StatusRefreshSeed_Number] = useState(0);
  const [App_SidebarCollapsed_Boolean, setApp_SidebarCollapsed_Boolean] = useState(false);
  const [App_Snackbar_Object, setApp_Snackbar_Object] = useState({
    open: false,
    severity: 'info',
    message: ''
  });

  const App_Notify_Function = useCallback((severity, message) => {
    setApp_Snackbar_Object({ open: true, severity, message });
  }, []);

  useEffect(() => {
    const loadPassphrase = async () => {
      if (!window.electronAPI?.readPassphrase) return;
      const saved = await window.electronAPI.readPassphrase();
      if (saved) setApp_Passphrase_String(saved);
    };
    loadPassphrase();
  }, []);

  const App_TitleBarContent_VisibleNode =
    App_ActivePage_String === 'home' ? App_TitleBarContent_Node : null;

  return (
    <ThemeProvider theme={App_Theme_Object}>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          color: 'text.primary'
        }}
      >
        <CustomTitleBar
          title="IPAbuyer"
          isSidebarCollapsed={App_SidebarCollapsed_Boolean}
          onToggleSidebar={() => setApp_SidebarCollapsed_Boolean((prev) => !prev)}
        >
          {App_TitleBarContent_VisibleNode}
        </CustomTitleBar>
        <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <Sidebar
            App_ActivePage_String={App_ActivePage_String}
            setApp_ActivePage_String={setApp_ActivePage_String}
            Sidebar_Collapsed_Boolean={App_SidebarCollapsed_Boolean}
          />
          <Box sx={{ flex: 1, minWidth: 0, px: 3, pb: 3, pt: 2, overflow: 'auto' }}>
            {App_ActivePage_String === 'home' && (
              <HomePage
                App_CountryCode_String={App_CountryCode_String}
                App_AuthState_Object={App_AuthState_Object}
                App_Passphrase_String={App_Passphrase_String}
                App_StatusRefreshSeed_Number={App_StatusRefreshSeed_Number}
                App_Notify_Function={App_Notify_Function}
                setApp_TitleBarContent_Node={setApp_TitleBarContent_Node}
              />
            )}
            {App_ActivePage_String === 'account' && (
              <AccountPage
                App_AuthState_Object={App_AuthState_Object}
                App_Passphrase_String={App_Passphrase_String}
                App_Notify_Function={App_Notify_Function}
                setApp_AuthState_Object={setApp_AuthState_Object}
                setApp_Passphrase_String={setApp_Passphrase_String}
              />
            )}
            {App_ActivePage_String === 'setting' && (
              <SettingPage
                App_CountryCode_String={App_CountryCode_String}
                App_DeveloperSite_String={App_DeveloperSite_String}
                App_Notify_Function={App_Notify_Function}
                setApp_CountryCode_String={setApp_CountryCode_String}
                setApp_DeveloperSite_String={setApp_DeveloperSite_String}
                setApp_StatusRefreshSeed_Number={setApp_StatusRefreshSeed_Number}
              />
            )}
          </Box>
        </Box>
        <Snackbar
          open={App_Snackbar_Object.open}
          autoHideDuration={3200}
          onClose={() => setApp_Snackbar_Object((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            severity={App_Snackbar_Object.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {App_Snackbar_Object.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};

export default App;
