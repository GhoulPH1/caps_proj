import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import NavBar from "../../components/gui/NavBar";
import SideBar from "../../components/gui/SideBar";
import { useUserStore } from '../../store/user';
import LoginReminder from '../../components/modals/LoginReminder';

const HomePage = () => {
  const navigate = useNavigate();
  const { 
    currentUser, 
    // showLoginPopup, 
    authenticatedNavigation,
    initUserSession 
  } = useUserStore();
  
  const [isReminderVisible, setIsReminderVisible] = useState(true);

  const today = new Date();
  const formattedDate = `${String(today.getDate()).padStart(2, '0')} / ${String(today.getMonth() + 1).padStart(2, '0')} / ${String(today.getFullYear()).slice(-2)}`;
  const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase(); 

  useEffect(() => {
    // Initialize user session when component mounts
    initUserSession();
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#121212] to-[#1e1e1e] text-white font-poppins overflow-hidden">
      {isReminderVisible && <LoginReminder onClose={() => setIsReminderVisible(false)} />}

      <div className="absolute inset-0 pointer-events-none opacity-1.5">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#262626_1px,transparent_0.5px),linear-gradient(to_bottom,#262626_1px,transparent_0.5px)] bg-[size:40px_40px]"></div>
      </div>

      <motion.div className="absolute top-2 left-2 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] -translate-x-2 -z-10" animate={{ opacity: [0, 1], scale: [0.9, 1] }} transition={{ duration: 1.5 }}></motion.div>
      
      <NavBar />
      <SideBar />

      <motion.div className="flex flex-col items-end justify-center text-right h-screen px-4 p-15 mr-15 pb-25 relative z-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }}>
        <motion.button 
          onClick={() => authenticatedNavigation(navigate, '/upload')}
          className={`text-sm font-bold px-4 py-2 mb-10 w-64 ${currentUser ? 'bg-gray-800/50 backdrop-blur-sm hover:bg-gray-700/60' : 'bg-gray-800/30 text-gray-500 cursor-not-allowed'} text-white rounded-2xl border-3 border-[#656565] transition-all duration-300 bg-gradient-to-r from-[#656565] to-[#4a4a4a] backdrop-blur-md px-1 py-2`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {currentUser ? 'Try SynoCore' : 'Login to Access'}
        </motion.button>

        <h2 className="text-[23px] font-outfit font-extrabold tracking-tight text-gray-400">DELIVERING <span className="font-extrabold text-white">CONFIDENCE</span></h2>
        <motion.h1 className="text-4xl font-outfit font-extrabold mt-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
          Through Verified Data Integrity.
        </motion.h1>
        <p className="text-gray-400 mt-3 max-w-xl font-prompt">Transforming data security into a seamless, trusted experience.</p>
        <motion.button 
          onClick={() => authenticatedNavigation(navigate, '/learn-more')} 
          className={`mt-4 text-sm font-poppins ${currentUser ? 'text-gray-400 hover:text-white' : 'text-gray-600 cursor-not-allowed'} transition-colors duration-300 hover:underline`}
          whileHover={{ scale: 1.1 }}
        >
          Learn more
        </motion.button>
      </motion.div>

      <div className="ml-10 mb-5 absolute bottom-6 left-6 flex space-x-10 text-gray-400 text-[10px] z-40">
        <motion.button onClick={() => authenticatedNavigation(navigate, '/verify-file')} className={`${currentUser ? 'hover:text-white' : 'text-gray-600 cursor-not-allowed'} p-5 mr-25 transition-colors duration-300`} whileHover={{ scale: 1.1 }}>HISTORY</motion.button>
        <motion.button onClick={() => authenticatedNavigation(navigate, '/upload')} className={`${currentUser ? 'hover:text-white' : 'text-gray-600 cursor-not-allowed'} p-5 mr-25 transition-colors duration-300`} whileHover={{ scale: 1.1 }}>LOGS</motion.button>
        <motion.button onClick={() => authenticatedNavigation(navigate, '/dashboard')} className={`${currentUser ? 'hover:text-white' : 'text-gray-600 cursor-not-allowed'} p-5 transition-colors duration-300`} whileHover={{ scale: 1.1 }}>CONTACT US</motion.button>
      </div>

      <div className="mb-11 mr-10 absolute bottom-5 right-10 text-white flex flex-col items-end text-right ">
        <span className="text-[11px] font-outfit-light text-gray-400">{formattedDate}</span>
        <span className="text-[10px] font-poppins-bold mt-1">{dayOfWeek}</span>
      </div>
    </div>
  );
};

export default HomePage;