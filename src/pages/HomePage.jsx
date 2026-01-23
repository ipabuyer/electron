import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Menu,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  TextField,
  Typography,
  Checkbox
} from '@mui/material';

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'unbought', label: '未购买' },
  { key: 'purchased', label: '已购买' },
  { key: 'owned', label: '已拥有' }
];

const HomePage_StatusLabel_Function = (status) => {
  if (status === 'purchased') return '已购买';
  if (status === 'owned') return '已拥有';
  return '未购买';
};

const HomePage = ({
  App_CountryCode_String,
  App_AuthState_Object,
  App_Passphrase_String,
  App_StatusRefreshSeed_Number,
  App_Notify_Function,
  setApp_TitleBarContent_Node
}) => {
  const [HomePage_SearchTerm_String, setHomePage_SearchTerm_String] = useState('');
  const [HomePage_Apps_Array, setHomePage_Apps_Array] = useState([]);
  const [HomePage_StatusMap_Object, setHomePage_StatusMap_Object] = useState({});
  const [HomePage_SelectedIds_Array, setHomePage_SelectedIds_Array] = useState([]);
  const [HomePage_Filter_String, setHomePage_Filter_String] = useState('all');
  const [HomePage_IsSearching_Boolean, setHomePage_IsSearching_Boolean] = useState(false);
  const [HomePage_ActionLoading_Boolean, setHomePage_ActionLoading_Boolean] = useState(false);
  const [HomePage_ContextMenu_Object, setHomePage_ContextMenu_Object] = useState(null);

  const HomePage_LoadStatuses_AsyncFunction = useCallback(async () => {
    if (!window.electronAPI?.listAppStatuses) return;
    const rows = await window.electronAPI.listAppStatuses();
    const map = {};
    for (const row of rows || []) {
      map[row.bundleId] = row;
    }
    setHomePage_StatusMap_Object(map);
  }, []);

  useEffect(() => {
    HomePage_LoadStatuses_AsyncFunction();
  }, [HomePage_LoadStatuses_AsyncFunction, App_StatusRefreshSeed_Number]);

  const HomePage_RunSearch_AsyncFunction = useCallback(async () => {
    if (!HomePage_SearchTerm_String.trim()) {
      App_Notify_Function('warning', '请输入搜索关键词');
      return;
    }
    setHomePage_IsSearching_Boolean(true);
    try {
      const HomePage_CountryCode_String = (App_CountryCode_String || 'cn').toLowerCase();
      const resp = await axios.get('https://itunes.apple.com/search', {
        params: {
          term: HomePage_SearchTerm_String.trim(),
          entity: 'software',
          limit: 50,
          country: HomePage_CountryCode_String
        }
      });
      const list = (resp.data?.results || []).map((item) => ({
        bundleId: item.bundleId || item.bundleID || item.bundleIdentifier || `unknown-${item.trackId}`,
        name: item.trackName,
        seller: item.sellerName,
        price: item.formattedPrice || item.price,
        version: item.version,
        artwork: item.artworkUrl100 || item.artworkUrl60
      }));
      setHomePage_Apps_Array(list);
      setHomePage_SelectedIds_Array([]);
      App_Notify_Function('success', `搜索完成，找到 ${list.length} 个应用`);
    } catch (error) {
      App_Notify_Function('error', '搜索失败，请检查网络');
    } finally {
      setHomePage_IsSearching_Boolean(false);
    }
  }, [App_CountryCode_String, App_Notify_Function, HomePage_SearchTerm_String]);

  const HomePage_AppRows_Array = useMemo(
    () =>
      HomePage_Apps_Array.map((app) => ({
        ...app,
        status: HomePage_StatusMap_Object[app.bundleId]?.status || 'unbought'
      })),
    [HomePage_Apps_Array, HomePage_StatusMap_Object]
  );

  const HomePage_FilteredApps_Array = useMemo(() => {
    if (HomePage_Filter_String === 'all') return HomePage_AppRows_Array;
    if (HomePage_Filter_String === 'unbought') {
      return HomePage_AppRows_Array.filter((a) => a.status === 'unbought');
    }
    return HomePage_AppRows_Array.filter((a) => a.status === HomePage_Filter_String);
  }, [HomePage_AppRows_Array, HomePage_Filter_String]);

  const HomePage_ToggleSelect_Function = useCallback((bundleId) => {
    setHomePage_SelectedIds_Array((prev) =>
      prev.includes(bundleId) ? prev.filter((id) => id !== bundleId) : [...prev, bundleId]
    );
  }, []);

  const HomePage_ToggleSelectAll_Function = useCallback(() => {
    if (HomePage_FilteredApps_Array.length === 0) return;
    const allIds = HomePage_FilteredApps_Array.map((app) => app.bundleId);
    const allSelected = allIds.every((id) => HomePage_SelectedIds_Array.includes(id));
    setHomePage_SelectedIds_Array(allSelected ? [] : allIds);
  }, [HomePage_FilteredApps_Array, HomePage_SelectedIds_Array]);

  const HomePage_HandleMarkStatus_AsyncFunction = useCallback(
    async (status, targetIds) => {
      if (!window.electronAPI?.setAppStatuses) return;
      const ids = targetIds && targetIds.length ? targetIds : HomePage_SelectedIds_Array;
      if (!ids.length) {
        App_Notify_Function('warning', '请选择需要处理的应用');
        return;
      }
      setHomePage_ActionLoading_Boolean(true);
      try {
        const rows = ids.map((bundleId) => ({
          bundleId,
          appName: HomePage_Apps_Array.find((a) => a.bundleId === bundleId)?.name || '',
          email: App_AuthState_Object.email || '',
          status
        }));
        await window.electronAPI.setAppStatuses(rows);
        await HomePage_LoadStatuses_AsyncFunction();
        App_Notify_Function('success', `已标记 ${ids.length} 个为${HomePage_StatusLabel_Function(status)}`);
      } catch (error) {
        App_Notify_Function('error', error.message || '标记失败');
      } finally {
        setHomePage_ActionLoading_Boolean(false);
      }
    },
    [
      App_AuthState_Object.email,
      App_Notify_Function,
      HomePage_Apps_Array,
      HomePage_LoadStatuses_AsyncFunction,
      HomePage_SelectedIds_Array
    ]
  );

  const HomePage_HandlePurchase_AsyncFunction = useCallback(
    async (bundleIds) => {
      const ids = bundleIds && bundleIds.length ? bundleIds : HomePage_SelectedIds_Array;
      if (!ids.length) {
        App_Notify_Function('warning', '请选择要购买的应用');
        return;
      }
      setHomePage_ActionLoading_Boolean(true);
      try {
        const appNameMap = Object.fromEntries(HomePage_Apps_Array.map((a) => [a.bundleId, a.name]));
        const res = await window.electronAPI.purchase({
          bundleIds: ids,
          passphrase: App_Passphrase_String,
          appNameMap,
          email: App_AuthState_Object.email
        });
        if (res.ok) {
          await HomePage_LoadStatuses_AsyncFunction();
          App_Notify_Function('success', '购买完成');
        } else {
          App_Notify_Function('error', res.error || res.message || '购买失败');
        }
      } catch (error) {
        App_Notify_Function('error', error.message || '购买失败');
      } finally {
        setHomePage_ActionLoading_Boolean(false);
      }
    },
    [
      App_AuthState_Object.email,
      App_Notify_Function,
      App_Passphrase_String,
      HomePage_Apps_Array,
      HomePage_LoadStatuses_AsyncFunction,
      HomePage_SelectedIds_Array
    ]
  );

  const HomePage_HandleDownload_AsyncFunction = useCallback(
    async (bundleIds) => {
      const ids = bundleIds && bundleIds.length ? bundleIds : HomePage_SelectedIds_Array;
      if (!ids.length) {
        App_Notify_Function('warning', '请选择要下载的应用');
        return;
      }
      setHomePage_ActionLoading_Boolean(true);
      try {
        const res = await window.electronAPI.download({
          bundleIds: ids,
          passphrase: App_Passphrase_String
        });
        if (res.ok) {
          App_Notify_Function('success', `下载完成，输出目录：${res.outputDir || ''}`);
        } else {
          App_Notify_Function('error', res.error || res.message || '下载失败');
        }
      } catch (error) {
        App_Notify_Function('error', error.message || '下载失败');
      } finally {
        setHomePage_ActionLoading_Boolean(false);
      }
    },
    [App_Notify_Function, App_Passphrase_String, HomePage_SelectedIds_Array]
  );

  const HomePage_HandleContextMenu_Function = useCallback((event, app) => {
    event.preventDefault();
    setHomePage_ContextMenu_Object({
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6,
      app
    });
  }, []);

  const HomePage_CloseContextMenu_Function = useCallback(() => {
    setHomePage_ContextMenu_Object(null);
  }, []);

  const HomePage_SelectedAll_Boolean =
    HomePage_FilteredApps_Array.length > 0 &&
    HomePage_FilteredApps_Array.every((app) => HomePage_SelectedIds_Array.includes(app.bundleId));
  const HomePage_PartialSelect_Boolean =
    HomePage_FilteredApps_Array.some((app) => HomePage_SelectedIds_Array.includes(app.bundleId)) &&
    !HomePage_SelectedAll_Boolean;

  const HomePage_TitleBarContent_Node = useMemo(
    () => (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flex: 1,
          maxWidth: 560,
          WebkitAppRegion: 'no-drag'
        }}
      >
        <TextField
          size="small"
          fullWidth
          placeholder="搜索应用"
          value={HomePage_SearchTerm_String}
          onChange={(e) => setHomePage_SearchTerm_String(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') HomePage_RunSearch_AsyncFunction();
          }}
        />
        <Button
          variant="contained"
          onClick={HomePage_RunSearch_AsyncFunction}
          disabled={HomePage_IsSearching_Boolean}
          sx={{ whiteSpace: 'nowrap' }}
        >
          {HomePage_IsSearching_Boolean ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            '搜索'
          )}
        </Button>
      </Box>
    ),
    [HomePage_IsSearching_Boolean, HomePage_RunSearch_AsyncFunction, HomePage_SearchTerm_String]
  );

  useEffect(() => {
    setApp_TitleBarContent_Node(HomePage_TitleBarContent_Node);
    return () => setApp_TitleBarContent_Node(null);
  }, [HomePage_TitleBarContent_Node, setApp_TitleBarContent_Node]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap'
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="contained"
            onClick={() => HomePage_HandlePurchase_AsyncFunction()}
            disabled={HomePage_ActionLoading_Boolean}
          >
            购买
          </Button>
          <Button
            variant="outlined"
            onClick={() => HomePage_HandleDownload_AsyncFunction()}
            disabled={HomePage_ActionLoading_Boolean}
          >
            下载
          </Button>
        </Stack>
        <Tabs
          value={HomePage_Filter_String}
          onChange={(_e, v) => setHomePage_Filter_String(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {FILTERS.map((filter) => (
            <Tab key={filter.key} value={filter.key} label={filter.label} />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ overflow: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Checkbox
                    indeterminate={HomePage_PartialSelect_Boolean}
                    checked={HomePage_SelectedAll_Boolean}
                    onChange={HomePage_ToggleSelectAll_Function}
                    size="small"
                  />
                  <Typography variant="subtitle2">App名称与图标</Typography>
                </Stack>
              </TableCell>
              <TableCell>AppID</TableCell>
              <TableCell>开发者</TableCell>
              <TableCell>版本号</TableCell>
              <TableCell>价格</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {HomePage_FilteredApps_Array.map((app) => {
              const selected = HomePage_SelectedIds_Array.includes(app.bundleId);
              return (
                <TableRow
                  key={app.bundleId}
                  hover
                  selected={selected}
                  onClick={() => HomePage_ToggleSelect_Function(app.bundleId)}
                  onContextMenu={(event) => HomePage_HandleContextMenu_Function(event, app)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Checkbox
                        checked={selected}
                        onClick={(event) => {
                          event.stopPropagation();
                          HomePage_ToggleSelect_Function(app.bundleId);
                        }}
                        size="small"
                      />
                      <Avatar src={app.artwork} alt={app.name} sx={{ width: 32, height: 32 }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {app.name}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{app.bundleId}</TableCell>
                  <TableCell>{app.seller || '-'}</TableCell>
                  <TableCell>{app.version || '-'}</TableCell>
                  <TableCell>{app.price ?? '-'}</TableCell>
                </TableRow>
              );
            })}
            {HomePage_FilteredApps_Array.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="text.secondary">
                    暂无数据，请先搜索或调整筛选条件
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>

      <Menu
        open={HomePage_ContextMenu_Object !== null}
        onClose={HomePage_CloseContextMenu_Function}
        anchorReference="anchorPosition"
        anchorPosition={
          HomePage_ContextMenu_Object !== null
            ? {
                top: HomePage_ContextMenu_Object.mouseY,
                left: HomePage_ContextMenu_Object.mouseX
              }
            : undefined
        }
      >
        <MenuItem
          onClick={() => {
            HomePage_HandlePurchase_AsyncFunction([HomePage_ContextMenu_Object?.app?.bundleId]);
            HomePage_CloseContextMenu_Function();
          }}
        >
          购买此App
        </MenuItem>
        <MenuItem
          onClick={() => {
            HomePage_HandleDownload_AsyncFunction([HomePage_ContextMenu_Object?.app?.bundleId]);
            HomePage_CloseContextMenu_Function();
          }}
        >
          下载此App
        </MenuItem>
        <MenuItem
          onClick={() => {
            HomePage_HandleMarkStatus_AsyncFunction('purchased', [HomePage_ContextMenu_Object?.app?.bundleId]);
            HomePage_CloseContextMenu_Function();
          }}
        >
          标记为已购买
        </MenuItem>
        <MenuItem
          onClick={() => {
            HomePage_HandleMarkStatus_AsyncFunction('owned', [HomePage_ContextMenu_Object?.app?.bundleId]);
            HomePage_CloseContextMenu_Function();
          }}
        >
          标记为已拥有
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default HomePage;
