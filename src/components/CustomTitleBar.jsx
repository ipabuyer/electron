import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import AppIcon from '../../assets/Square44x44Logo.scale-200.png';

const CustomTitleBar = ({ title, isSidebarCollapsed, onToggleSidebar }) => {
  return (
    <Box
      sx={{
        position: 'relative',
        height: 52,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        zIndex: 20000
      }}
    >
      <Box
        component="title-bar"
        windowtitle=""
        sx={{
          height: 52,
          width: '100%',
          zIndex: 1
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          px: 2,
          pointerEvents: 'none',
          zIndex: 20001
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pointerEvents: 'auto' }}>
          <IconButton size="small" onClick={onToggleSidebar} sx={{ WebkitAppRegion: 'no-drag' }}>
            {isSidebarCollapsed ? <MenuIcon fontSize="small" /> : <MenuOpenIcon fontSize="small" />}
          </IconButton>
          <Box sx={{ width: 20, height: 20 }}>
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
      </Box>
    </Box>
  );
};

export default CustomTitleBar;
