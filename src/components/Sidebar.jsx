import React from 'react';
import { List, ListItemButton, ListItemText } from '@mui/material';

const Sidebar = ({ App_ActivePage_String, setApp_ActivePage_String }) => {
  const Sidebar_Items_Array = [
    { key: 'home', label: '主页' },
    { key: 'account', label: '账户' },
    { key: 'setting', label: '设置' }
  ];

  return (
    <List
      sx={{
        width: 180,
        minWidth: 140,
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
        height: '100%'
      }}
    >
      {Sidebar_Items_Array.map((item) => (
        <ListItemButton
          key={item.key}
          selected={App_ActivePage_String === item.key}
          onClick={() => setApp_ActivePage_String(item.key)}
        >
          <ListItemText primary={item.label} />
        </ListItemButton>
      ))}
    </List>
  );
};

export default Sidebar;
