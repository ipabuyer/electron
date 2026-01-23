import React from 'react';
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Tooltip } from '@mui/material';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';

const Sidebar = ({ App_ActivePage_String, setApp_ActivePage_String, Sidebar_Collapsed_Boolean }) => {
  const Sidebar_Items_Array = [
    { key: 'home', label: '主页', icon: <HomeOutlinedIcon fontSize="small" /> },
    { key: 'account', label: '账户', icon: <AccountCircleOutlinedIcon fontSize="small" /> },
    { key: 'setting', label: '设置', icon: <SettingsOutlinedIcon fontSize="small" /> }
  ];
  const sidebarWidth = Sidebar_Collapsed_Boolean ? 72 : 200;

  return (
    <Box
      sx={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        bgcolor: 'background.default',
        borderRight: 1,
        borderColor: 'divider',
        height: '100%',
        minHeight: '100%',
        alignSelf: 'stretch',
        display: 'flex',
        flexDirection: 'column',
        pt: 1
      }}
    >
      <List sx={{ px: 1, pt: 1 }}>
        {Sidebar_Items_Array.map((item) => {
          const content = (
            <ListItemButton
              selected={App_ActivePage_String === item.key}
              onClick={() => setApp_ActivePage_String(item.key)}
              sx={{
                borderRadius: 1.5,
                mb: 0.5,
                justifyContent: Sidebar_Collapsed_Boolean ? 'center' : 'flex-start',
                '&.Mui-selected': {
                  bgcolor: 'action.selected',
                  fontWeight: 600
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: Sidebar_Collapsed_Boolean ? 'auto' : 36 }}>
                {item.icon}
              </ListItemIcon>
              {!Sidebar_Collapsed_Boolean && <ListItemText primary={item.label} />}
            </ListItemButton>
          );
          if (!Sidebar_Collapsed_Boolean) {
            return <Box key={item.key}>{content}</Box>;
          }
          return (
            <Tooltip key={item.key} title={item.label} placement="right">
              {content}
            </Tooltip>
          );
        })}
      </List>
    </Box>
  );
};

export default Sidebar;
