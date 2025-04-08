import { create } from 'zustand';

const useRegisterStore = create((set, get) => {
  // Initial form state
  const initialState = {
    stage: 1,
    loading: false,
    error: '',
    formData: {
      firstName: '',
      middleInitial: '',
      surname: '',
      sexualOrientation: '',
      birthYear: '',
      birthMonth: '',
      birthDay: '',
      email: '',
      password: '',
      confirmPassword: '',
      pin: '',
      securityPhrase: '',
      securityAnswer: ''
    },
    showPassword: false,
    showPin: false,
    fullName: '',
    birthday: null
  };

  // Validation rules
  const validators = {
    stage1: () => {
      const { formData, birthday, setError } = get();
      
      if (!formData.firstName.trim()) return setError('First name is required');
      if (!formData.surname.trim()) return setError('Surname is required');
      if (!formData.sexualOrientation) return setError('Please select your sexual orientation');
      if (!birthday) return setError('Please enter a valid date of birth');
      
      return true;
    },
    
    stage2: () => {
      const { formData, setError } = get();
      
      if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(formData.email))
        return setError('Please enter a valid email address');
      
      // Password length validation
      if (formData.password.length < 8)
        return setError('Password must be at least 8 characters');
      
      // Check for uppercase letter
      if (!/[A-Z]/.test(formData.password))
        return setError('Password must contain at least one uppercase letter');
      
      // Check for number
      if (!/\d/.test(formData.password))
        return setError('Password must contain at least one number');
      
      // Check for special character
      if (!/[\W_]/.test(formData.password))
        return setError('Password must contain at least one special character');
      
      // Confirm password match
      if (formData.password !== formData.confirmPassword)
        return setError('Passwords do not match');
      
      return true;
    },
    
    stage3: () => {
      const { formData, setError } = get();
      return /^\d{4}$/.test(formData.pin) ? true : setError('PIN must be exactly 4 digits');
    }
  };

  return {
    ...initialState,
    
    // Actions
    setStage: (stage) => set({ stage }),
    
    setFormData: (fieldName, value) => {
      set(state => ({
        formData: { ...state.formData, [fieldName]: value },
        error: ''
      }));
      
      const { formData } = get();
      
      // Update derived values
      if (['firstName', 'middleInitial', 'surname'].includes(fieldName)) {
        const nameComponents = [
          formData.firstName,
          formData.middleInitial ? `${formData.middleInitial}.` : '',
          formData.surname
        ].filter(Boolean);
        
        set({ fullName: nameComponents.join(' ') });
      }
      
      if (['birthYear', 'birthMonth', 'birthDay'].includes(fieldName)) {
        const birthdate = new Date(
          parseInt(formData.birthYear || 0),
          parseInt(formData.birthMonth || 1) - 1,
          parseInt(formData.birthDay || 0)
        );
        
        set({ birthday: isNaN(birthdate.getTime()) ? null : birthdate });
      }
    },
    
    togglePasswordVisibility: () => set(state => ({ showPassword: !state.showPassword })),
    togglePinVisibility: () => set(state => ({ showPin: !state.showPin })),
    setError: (error) => set({ error }),
    
    // Stage validation methods
    validateStage1: () => {
      if (!validators.stage1()) return false;
      set({ stage: 2, error: '' });
      return true;
    },
    
    validateStage2: () => {
      if (!validators.stage2()) return false;
      set({ stage: 3, error: '' });
      return true;
    },
    
    validateStage3: () => {
      if (!validators.stage3()) return false;
      set({ stage: 4, error: '' });
      return true;
    },
    
    // Utility functions
    calculateAge: (birthday) => {
      if (!birthday) return 0;
      const today = new Date();
      let age = today.getFullYear() - birthday.getFullYear();
      const monthDiff = today.getMonth() - birthday.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
        age--;
      }
      
      return age;
    },
    
    // Submit registration
    submitRegistration: async (createUser, navigate) => {
      const { formData, setError, birthday, calculateAge, fullName } = get();
      
      // Validate final form
      if (!/^\d{4}$/.test(formData.pin))
        return setError('PIN must be exactly 4 digits');
      
      if (formData.securityPhrase.trim().length < 10)
        return setError('Security phrase must be at least 10 characters long');
      
      if (!formData.securityAnswer.trim())
        return setError('Security answer is required');
      
      set({ loading: true });
      
      try {
        const userData = {
          name: fullName,
          email: formData.email,
          password: formData.password,
          pin: formData.pin,
          birthday: birthday.toISOString(),
          age: calculateAge(birthday),
          sexualOrientation: formData.sexualOrientation,
          securityPhrase: formData.securityPhrase,
          securityAnswer: formData.securityAnswer
        };
        
        const result = await createUser(userData);
        
        if (result.success) {
          navigate('/login', { state: { message: result.msg } });
        } else {
          setError(result.msg || 'Registration failed. Please try again.');
        }
      } catch (err) {
        setError(err.message || 'Registration failed. Please try again.');
      } finally {
        set({ loading: false });
      }
    },
    
    // Reset form state
    resetForm: () => set(initialState)
  };
});

export default useRegisterStore;