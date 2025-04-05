import { motion } from "framer-motion";
import logo from "../assets/synocore-logo.png"; // Ensure correct path

const LoadingScreen = () => {
  return (
    <div className="relative flex items-center justify-center h-screen bg-black text-white overflow-hidden">
      
      {/* Background Glow Effect */}
      <motion.div
        className="absolute w-[500px] h-[500px] bg-white opacity-20 blur-3xl rounded-full"
        initial={{ scale: 0.8, opacity: 0.1 }}
        animate={{ scale: 1.3, opacity: 0.2 }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
        }}
      />

      {/* Content: Logo & Loading Text */}
      <div className="relative z-10 flex flex-col items-center">
        
        {/* Animated Logo */}
        <motion.img
          src={logo}
          alt="Synocore Logo"
          className="w-32 h-32"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 3,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "reverse",
          }}
        />

        {/* Loading Text */}
        <motion.p
          className="mt-2 text-sm text-gray-300 font-poppina"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 2,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "reverse",
          }}
        >
          Loading please wait...
        </motion.p>
      </div>
    </div>
  );
};

export default LoadingScreen;
