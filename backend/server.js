import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import User from './models/user.model.js';

dotenv.config();

const port = 3000;

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server is running!');
});

app.post('/api/user-register', async (req, res) =>{ 
    const user = req.body;

    if(!user.name || !user.password || !user.email) { 
     return res.status(400).json({ success:false,  msg: 'Please include all required fields' });
    }

    const newUser = new User(user);

    try { 
        await newUser.save(); 
        res.status(200).json({ success:true, data:newUser}); 
    } catch (error) { 
        console.error("User Registration Error", error.msg);
        res.status(500).send({ success: false, msg: "Server Error"});   
    } 
}); 

app.delete('/api/user-delete/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    
    // Find the user first to confirm it exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }
  
    await User.findByIdAndDelete(id);
    
    return res.status(200).json({ success: true, msg: "User removed successfully" });
  } catch (error) {
    console.error("User Deletion Error:", error.message);
    return res.status(500).json({ success: false, msg: "Server error", error: error.message });
  }
});

app.listen(port, () => {
  connectDB();  
  console.log(`Server started at http://localhost:${port}`);
});