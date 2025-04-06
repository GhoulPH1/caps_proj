import React from 'react';
import { useNavigate } from 'react-router-dom';

const NavBar = () => {
  const navigate = useNavigate();

  return (
    <nav className="flex justify-between items-center text-white px-10 py-4 absolute top-0 left-0 right-0 z-40 font-poppins">
      {/* Logo */}
      <div className="m-5 flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
        <img src="/src/assets/synocore-logo.png" alt="SynoCore Logo" className="h-9 w-auto" />
        <span className="text-sm font-semibold">SynoCore</span>
      </div>

      {/* Navigation Links */}
      <div className="flex space-x-10 text-[10px]">
        <button onClick={() => navigate('/')} className="hover:text-white p-5 mr-25">HOME</button>
        <button onClick={() => navigate('/vault')} className="hover:text-white p-5 mr-25">VAULT</button>
        <button onClick={() => navigate('/about')} className="hover:text-white p-5">ABOUT</button>
      </div>
    </nav>
  );
};

export default NavBar;