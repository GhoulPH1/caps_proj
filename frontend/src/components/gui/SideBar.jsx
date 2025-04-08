import React, { lazy } from 'react';
const SignalCellularAlt = lazy(() => import('@mui/icons-material/SignalCellularAlt'));
const Security = lazy(() => import('@mui/icons-material/Security'));
const Folder = lazy(() => import('@mui/icons-material/Folder'));

const SideBar = () => {
  return (
    <div className="m-5 p-5 absolute left-6 top-1/4 flex flex-col space-y-20 text-gray-400 z-40">
      <SignalCellularAlt 
        fontSize="small"  // This is the key to making icons smaller
        className="text-sm opacity-70 hover:opacity-100 transition-opacity" 
      />
      <Security 
        fontSize="small" 
        className="text-sm opacity-70 hover:opacity-100 transition-opacity" 
      />
      <Folder 
        fontSize="small" 
        className="text-sm opacity-70 hover:opacity-100 transition-opacity" 
      />
    </div>
  );
};

export default SideBar;