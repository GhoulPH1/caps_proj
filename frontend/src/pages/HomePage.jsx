import React from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar.jsx';
import SideBar from '../components/SideBar.jsx';
import FileCheck from '../components/FileCheck.jsx';

const HomePage = () => {
  const navigate = useNavigate();

  const handleRedirect = () => {
    navigate('/upload'); // Redirects to the Upload page
  };

  return (
    <>
      <NavBar />
      <SideBar />
      <FileCheck />
      <div className="p-4">
        <button 
          onClick={handleRedirect} 
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          Upload File
        </button>
      </div>
      <p>HomePage</p>
    </>
  );
};

export default HomePage;
