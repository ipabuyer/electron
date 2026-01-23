import React from 'react';
import { Box, Typography } from '@mui/material';

const CustomTitleBar = ({ title, children }) => {
  return (
    <Box
      sx={{
        WebkitAppRegion: 'drag',
        height: 40,
        display: 'flex',
        alignItems: 'center',
        px: 2,
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        userSelect: 'none'
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          WebkitAppRegion: 'no-drag'
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default CustomTitleBar;
