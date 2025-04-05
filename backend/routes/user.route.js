import express from 'express';
import { validateToken } from '../middleware/auth.middleware.js';
import { 
  getUserSession, 
  removeUser, 
  userRegister, 
  updateCredentials, 
  fetchUsers, 
  validateCredentials, 
  validatePin, 
  loginUser 
} from '../controllers/user.controller.js';

const router = express.Router(); 

router.post('/', userRegister); 

router.delete('/:id', removeUser);

router.get('/', fetchUsers);

router.patch('/:id', updateCredentials);

// User authentication routes
router.post('/validate-credentials', validateCredentials);

router.post('/validate-pin', validatePin);

router.post('/login', loginUser);

router.get('/session', validateToken, getUserSession);

export default router;