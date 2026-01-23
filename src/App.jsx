import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  Checkbox
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#5ac8fa' },
    secondary: { main: '#a78bfa' },
    background: {
      default: '#0f1115',
      paper: '#111827'
    }
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif"
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(140deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
          border: '1px solid rgba(255,255,255,0.04)'
        }
      }
    }
  }
});

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'unbought', label: '未购买' },
  { key: 'purchased', label: '已购买' },
  { key: 'owned', label: '已拥有' }
];

const statusLabel = (status) => {
  if (status === 'purchased') return '已购买';
  if (status === 'owned') return '已拥有';
  return '未购买';
};

const StatusChip = ({ status }) => {
  const color = status === 'purchased' ? 'primary' : status === 'owned' ? 'secondary' : 'default';
  return <Chip size="small" color={color} label={statusLabel(status)} variant={status === 'unbought' ? 'outlined' : 'filled'} />;
};

const SectionCard = ({ title, actions, children }) => (
  <Paper elevation={0} sx={{ p: 3, gap: 2, display: 'flex', flexDirection: 'column' }}>
    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
      <Typography variant="h6" fontWeight={700} color="#e5e7eb">
        {title}
      </Typography>
      {actions}
    </Stack>
    {children}
  </Paper>
);

const InputLabel = ({ text }) => (
  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
    {text}
  </Typography>
);

function App() {
  const electronAPI = window.electronAPI;
  const [searchTerm, setSearchTerm] = useState('');
  const [country, setCountry] = useState('CN');
  const [limit, setLimit] = useState(25);
  const [apps, setApps] = useState([]);
  const [searching, setSearching] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [statusMap, setStatusMap] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, severity: 'info', message: '' });
  const [passphrase, setPassphrase] = useState('');
  const [authState, setAuthState] = useState({ email: '', isTest: false, loggedIn: false });
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '', authCode: '', passphrase: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [envInfo, setEnvInfo] = useState(null);
  const [logLines, setLogLines] = useState([]);

  const addLog = (line) => {
    setLogLines((prev) => [...prev.slice(-18), `${new Date().toLocaleTimeString()} ${line}`]);
  };

  const notify = (severity, message) => setSnackbar({ open: true, severity, message });

  const loadEnv = async () => {
    if (!electronAPI?.getEnvironment) return;
    const env = await electronAPI.getEnvironment();
    setEnvInfo(env);
  };

  const loadPassphrase = async () => {
    if (!electronAPI?.readPassphrase) return;
    const saved = await electronAPI.readPassphrase();
    if (saved) {
      setPassphrase(saved);
      setLoginForm((prev) => ({ ...prev, passphrase: saved }));
    }
  };

  const refreshStatuses = async () => {
    if (!electronAPI?.listAppStatuses) return;
    const rows = await electronAPI.listAppStatuses();
    const map = {};
    for (const row of rows || []) {
      map[row.bundleId] = row;
    }
    setStatusMap(map);
  };

  useEffect(() => {
    refreshStatuses();
    loadPassphrase();
    loadEnv();
  }, []);

  const rowsWithStatus = useMemo(
    () =>
      apps.map((app) => ({
        ...app,
        status: statusMap[app.bundleId]?.status || 'unbought',
        lastEmail: statusMap[app.bundleId]?.email || ''
      })),
    [apps, statusMap]
  );

  const filteredApps = useMemo(() => {
    if (filter === 'all') return rowsWithStatus;
    if (filter === 'unbought') return rowsWithStatus.filter((a) => a.status === 'unbought');
    return rowsWithStatus.filter((a) => a.status === filter);
  }, [rowsWithStatus, filter]);

  const toggleSelect = (bundleId) => {
    setSelected((prev) => (prev.includes(bundleId) ? prev.filter((id) => id !== bundleId) : [...prev, bundleId]));
  };

  const toggleSelectAll = () => {
    if (filteredApps.length === 0) return;
    const allIds = filteredApps.map((a) => a.bundleId);
    const allSelected = allIds.every((id) => selected.includes(id));
    setSelected(allSelected ? [] : allIds);
  };

  const runSearch = async () => {
    if (!searchTerm.trim()) {
      notify('warning', '请输入搜索关键字');
      return;
    }
    setSearching(true);
    try {
      const resp = await axios.get('https://itunes.apple.com/search', {
        params: {
          term: searchTerm,
          entity: 'software',
          limit,
          country
        }
      });
      const list = (resp.data?.results || []).map((item) => ({
        id: item.trackId,
        bundleId: item.bundleId || item.bundleID || item.bundleIdentifier || `unknown-${item.trackId}`,
        name: item.trackName,
        seller: item.sellerName,
        price: item.formattedPrice || item.price,
        version: item.version,
        description: item.description,
        artwork: item.artworkUrl100,
        url: item.trackViewUrl
      }));
      setApps(list);
      addLog(`搜索到 ${list.length} 个结果`);
    } catch (error) {
      notify('error', '搜索失败，请检查网络');
      addLog(`搜索失败：${error.message}`);
    } finally {
      setSearching(false);
    }
  };

  const handleMarkStatus = async (status, targetIds) => {
    if (!electronAPI?.setAppStatuses) return;
    const ids = targetIds && targetIds.length ? targetIds : selected;
    if (!ids.length) {
      notify('warning', '请选择至少一个应用');
      return;
    }
    setActionLoading(true);
    try {
      const rows = ids.map((bundleId) => ({
        bundleId,
        appName: apps.find((a) => a.bundleId === bundleId)?.name || '',
        email: authState.email || '',
        status
      }));
      const updated = await electronAPI.setAppStatuses(rows);
      const map = {};
      for (const row of updated || []) map[row.bundleId] = row;
      setStatusMap(map);
      notify('success', `已标记 ${ids.length} 个为${statusLabel(status)}`);
      addLog(`标记状态：${ids.join(', ')}`);
    } catch (error) {
      notify('error', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePurchase = async (bundleIds) => {
    const ids = bundleIds && bundleIds.length ? bundleIds : selected;
    if (!ids.length) {
      notify('warning', '请选择要购买的应用');
      return;
    }
    setActionLoading(true);
    try {
      const appNameMap = Object.fromEntries(apps.map((a) => [a.bundleId, a.name]));
      const res = await electronAPI.purchase({ bundleIds: ids, passphrase, appNameMap, email: authState.email });
      if (res.ok) {
        await refreshStatuses();
        notify('success', '购买完成');
        addLog(`购买成功：${ids.join(', ')}`);
      } else {
        notify('error', res.error || res.message || '购买失败');
        addLog(`购买失败：${res.error || res.message}`);
      }
    } catch (error) {
      notify('error', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownload = async (bundleIds) => {
    const ids = bundleIds && bundleIds.length ? bundleIds : selected;
    if (!ids.length) {
      notify('warning', '请选择要下载的应用');
      return;
    }
    setActionLoading(true);
    try {
      const res = await electronAPI.download({ bundleIds: ids, passphrase });
      if (res.ok) {
        notify('success', '下载完成');
        addLog(`下载完成：${ids.join(', ')} 输出 ${res.outputDir}`);
      } else {
        notify('error', res.error || res.message || '下载失败');
        addLog(`下载失败：${res.error || res.message}`);
      }
    } catch (error) {
      notify('error', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const submitLogin = async () => {
    if (!loginForm.email || !loginForm.password || !loginForm.passphrase) {
      notify('warning', '请填写邮箱、密码与加密密钥');
      return;
    }
    setActionLoading(true);
    try {
      const res = await electronAPI.login(loginForm);
      if (res.ok) {
        setAuthState({ email: loginForm.email, isTest: res.mock === true, loggedIn: true });
        setPassphrase(loginForm.passphrase);
        notify('success', res.mock ? '测试账户登录成功' : '登录成功');
        addLog(`登录：${loginForm.email}`);
        setLoginOpen(false);
      } else {
        notify('error', res.stderr || res.error || '登录失败');
        addLog(`登录失败：${res.stderr || res.error}`);
      }
    } catch (error) {
      notify('error', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const checkAuth = async () => {
    if (!passphrase) {
      notify('warning', '请先输入加密密钥');
      return;
    }
    try {
      const res = await electronAPI.authInfo({ passphrase });
      if (res.ok) {
        notify('info', res.mock ? '测试账户已登录' : res.stdout || '处于登录状态');
      } else {
        notify('error', res.stderr || res.error || '未登录');
      }
    } catch (error) {
      notify('error', error.message);
    }
  };

  const logout = async () => {
    try {
      const res = await electronAPI.authRevoke();
      if (res.ok) {
        setAuthState({ email: '', isTest: false, loggedIn: false });
        notify('info', '已登出');
      } else {
        notify('error', res.stderr || res.error || '登出失败');
      }
    } catch (error) {
      notify('error', error.message);
    }
  };

  const handleContextMenu = (event, app) => {
    event.preventDefault();
    setContextMenu(
      contextMenu === null
        ? {
            mouseX: event.clientX + 2,
            mouseY: event.clientY - 6,
            app
          }
        : null
    );
  };

  const closeContextMenu = () => setContextMenu(null);

  const selectedAll = filteredApps.length > 0 && filteredApps.every((app) => selected.includes(app.bundleId));
  const partialSelect = filteredApps.some((app) => selected.includes(app.bundleId)) && !selectedAll;

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: '100vh', background: 'radial-gradient(120% 120% at 20% 20%, #182133 0%, #0f1115 35%, #0a0d12 70%)', color: '#e5e7eb', p: 3 }}>
        <Stack spacing={3} sx={{ maxWidth: 1280, mx: 'auto' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
            <Box>
              <Typography variant="h4" fontWeight={800} color="#f9fafb">
                IPAbuyer
              </Typography>
              <Typography variant="body1" color="text.secondary">
                通过 iTunes API 搜索、购买、下载应用，支持状态同步与本地加密密钥。
              </Typography>
              <Typography variant="caption" color="text.secondary">
                新创建的苹果账号需先在设备 AppStore 登录并完成一次购买后才能使用本软件。
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" color="primary" onClick={() => setLoginOpen(true)}>
                登录苹果账户
              </Button>
              <Button variant="outlined" color="secondary" onClick={checkAuth}>
                查询登录状态
              </Button>
              <Button variant="text" color="inherit" onClick={logout}>
                退出登录
              </Button>
            </Stack>
          </Stack>

          <SectionCard
            title="搜索 App"
            actions={
              <Stack direction="row" spacing={1} alignItems="center">
                {searching && <CircularProgress size={18} />}
                <Button variant="contained" onClick={runSearch} disabled={searching}>
                  搜索
                </Button>
              </Stack>
            }
          >
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Box sx={{ flex: 2 }}>
                <InputLabel text="搜索名称" />
                <TextField
                  size="small"
                  fullWidth
                  placeholder="App 名称关键词"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') runSearch();
                  }}
                />
              </Box>
              <Box sx={{ width: 140 }}>
                <InputLabel text="国家代码 (ISO 3166-1 Alpha-2)" />
                <TextField size="small" value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} />
              </Box>
              <Box sx={{ width: 140 }}>
                <InputLabel text="限制数量" />
                <TextField
                  size="small"
                  type="number"
                  inputProps={{ min: 1, max: 200 }}
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value) || 1)}
                />
              </Box>
              <Box sx={{ minWidth: 220 }}>
                <InputLabel text="加密密钥 (keychain passphrase)" />
                <TextField
                  size="small"
                  placeholder="用于 ipatool"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  onBlur={() => electronAPI?.savePassphrase?.(passphrase)}
                />
              </Box>
            </Stack>
            {searching && <LinearProgress color="primary" sx={{ mt: 2 }} />}
          </SectionCard>

          <SectionCard
            title="应用列表"
            actions={
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="contained" color="primary" disabled={actionLoading} onClick={() => handlePurchase()}>购买选中</Button>
                <Button size="small" variant="outlined" color="primary" disabled={actionLoading} onClick={() => handleDownload()}>下载选中</Button>
                <Button size="small" variant="text" color="secondary" disabled={actionLoading} onClick={() => handleMarkStatus('owned')}>
                  标记为已拥有
                </Button>
                <Button size="small" variant="text" color="inherit" disabled={actionLoading} onClick={() => handleMarkStatus('purchased')}>
                  标记为已购买
                </Button>
              </Stack>
            }
          >
            <Tabs value={filter} onChange={(_e, v) => setFilter(v)} sx={{ mb: 2 }}>
              {FILTERS.map((f) => (
                <Tab key={f.key} label={f.label} value={f.key} />
              ))}
            </Tabs>
            <Box sx={{ overflow: 'auto', maxHeight: 480 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={partialSelect}
                        checked={selectedAll}
                        onChange={toggleSelectAll}
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>名称</TableCell>
                    <TableCell>Bundle ID</TableCell>
                    <TableCell>开发者</TableCell>
                    <TableCell>价格</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>版本</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredApps.map((app) => (
                    <TableRow
                      key={app.bundleId}
                      hover
                      onContextMenu={(e) => handleContextMenu(e, app)}
                      selected={selected.includes(app.bundleId)}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selected.includes(app.bundleId)}
                          onChange={() => toggleSelect(app.bundleId)}
                          color="primary"
                        />
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography fontWeight={700}>{app.name}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {app.description}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{app.bundleId}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {app.seller || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>{app.price ?? '-'}</TableCell>
                      <TableCell>
                        <StatusChip status={app.status} />
                      </TableCell>
                      <TableCell>{app.version || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {filteredApps.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="text.secondary">
                          暂无数据，先搜索或者调整筛选。
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </SectionCard>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <SectionCard title="账户 & 密钥" actions={null}>
              <Stack spacing={1.5}>
                <Typography variant="body2" color="text.secondary">
                  购买/下载需要使用 ipatool 登录。默认提供测试账户 test/test（购买、下载直接成功）。
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button variant="contained" onClick={() => setLoginOpen(true)}>
                    登录
                  </Button>
                  <Button variant="outlined" onClick={checkAuth}>
                    查询登录状态
                  </Button>
                  <Button variant="text" onClick={logout}>
                    退出登录
                  </Button>
                </Stack>
                <Divider light />
                <Stack spacing={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    数据库路径（自动按 Debug/Release 存放）：
                  </Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                    {envInfo?.dbPath || '...'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    下载路径：{envInfo?.downloadsDir || '...'}
                  </Typography>
                </Stack>
              </Stack>
            </SectionCard>

            <SectionCard title="操作日志" actions={null}>
              <Box sx={{ maxHeight: 220, overflow: 'auto', fontFamily: 'ui-monospace, SFMono-Regular', fontSize: 13 }}>
                {logLines.map((line, idx) => (
                  <Typography key={idx} variant="body2" color="text.secondary">
                    {line}
                  </Typography>
                ))}
                {logLines.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    暂无日志
                  </Typography>
                )}
              </Box>
            </SectionCard>
          </Stack>
        </Stack>

        <Menu
          open={contextMenu !== null}
          onClose={closeContextMenu}
          anchorReference="anchorPosition"
          anchorPosition={
            contextMenu !== null
              ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
              : undefined
          }
        >
          <MenuItem
            onClick={() => {
              handlePurchase([contextMenu?.app?.bundleId]);
              closeContextMenu();
            }}
          >
            购买此 App
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleDownload([contextMenu?.app?.bundleId]);
              closeContextMenu();
            }}
          >
            下载此 App
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleMarkStatus('purchased', [contextMenu?.app?.bundleId]);
              closeContextMenu();
            }}
          >
            标记为已购买
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleMarkStatus('owned', [contextMenu?.app?.bundleId]);
              closeContextMenu();
            }}
          >
            标记为已拥有
          </MenuItem>
        </Menu>

        <Dialog open={loginOpen} onClose={() => setLoginOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>登录苹果账户</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="邮箱"
              fullWidth
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
            />
            <TextField
              label="密码"
              type="password"
              fullWidth
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
            />
            <TextField
              label="双重验证码（可选）"
              fullWidth
              value={loginForm.authCode}
              onChange={(e) => setLoginForm({ ...loginForm, authCode: e.target.value })}
              helperText="可先输入邮箱+密码等待验证码，再输入验证码登录"
            />
            <TextField
              label="加密密钥 (keychain passphrase)"
              fullWidth
              value={loginForm.passphrase}
              onChange={(e) => {
                setLoginForm({ ...loginForm, passphrase: e.target.value });
                setPassphrase(e.target.value);
              }}
              helperText="更改密钥需先退出登录再重新登录"
            />
            <Alert severity="info" variant="outlined">
              若收不到验证码，请打开 https://account.apple.com/ 登录后输入验证码；新账号需先在设备 AppStore 完成一次购买。
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLoginOpen(false)}>取消</Button>
            <Button variant="contained" onClick={submitLogin} disabled={actionLoading}>
              {actionLoading ? '处理中...' : '登录'}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3200}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

export default App;
