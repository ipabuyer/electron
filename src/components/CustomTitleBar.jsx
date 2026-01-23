import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import AppIcon from '../../assets/Icon.ico';

const CustomTitleBar = ({ title, children, isSidebarCollapsed, onToggleSidebar }) => {
  return (
    <Box
      sx={{
        WebkitAppRegion: 'drag',
        height: 52,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        px: 2,
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        userSelect: 'none'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ WebkitAppRegion: 'no-drag' }}>
          <IconButton size="small" onClick={onToggleSidebar}>
            {isSidebarCollapsed ? <MenuIcon fontSize="small" /> : <MenuOpenIcon fontSize="small" />}
          </IconButton>
        </Box>
        <Box sx={{ width: 20, height: 20, WebkitAppRegion: 'no-drag' }}>
          <Box
            component="img"
            src={AppIcon}
            alt="IPAbuyer"
            sx={{ width: 20, height: 20, display: 'block' }}
          />
        </Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
      </Box>
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          WebkitAppRegion: 'no-drag',
          pr: 14
        }}
      >
        {children}
      </Box>
      <Box sx={{ width: 120 }} />
    </Box>
  );
};

export default CustomTitleBar;
