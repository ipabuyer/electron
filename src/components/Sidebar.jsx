import React from 'react';
import { Box, List, ListItemButton, ListItemText, Typography } from '@mui/material';

const Sidebar = ({ App_ActivePage_String, setApp_ActivePage_String }) => {
  const Sidebar_Items_Array = [
    { key: 'home', label: '主页' },
    { key: 'account', label: '账户' },
    { key: 'setting', label: '设置' }
  ];

  return (
    <Box
      sx={{
        width: 200,
        minWidth: 160,
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box sx={{ px: 2, py: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          导航
        </Typography>
      </Box>
      <List sx={{ px: 1, pt: 0 }}>
        {Sidebar_Items_Array.map((item) => (
          <ListItemButton
            key={item.key}
            selected={App_ActivePage_String === item.key}
            onClick={() => setApp_ActivePage_String(item.key)}
            sx={{
              borderRadius: 1.5,
              mb: 0.5,
              '&.Mui-selected': {
                bgcolor: 'action.selected',
                fontWeight: 600
              }
            }}
          >
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
};

export default Sidebar;
