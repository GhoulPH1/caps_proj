import { create } from 'zustand';

// Registration store with Zustand
const useRegisterStore = create((set, get) => ({
  // Form state
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
  
  // Derived values
  fullName: '',
  birthday: null,
  
  // Actions
  setStage: (stage) => set({ stage }),
  
  setFormData: (fieldName, value) => {
    set((state) => ({
      formData: {
        ...state.formData,
        [fieldName]: value
      },
      error: '' // Clear error on input change
    }));
    
    // Update derived values after form data changes
    const currentState = get();
    const { formData } = currentState;
    
    // Update full name
    if (['firstName', 'middleInitial', 'surname'].includes(fieldName)) {
      const nameComponents = [
        formData.firstName,
        formData.middleInitial ? `${formData.middleInitial}.` : '',
        formData.surname
      ].filter(Boolean);
      
      set({ fullName: nameComponents.join(' ') });
    }
    
    // Update birthday
    if (['birthYear', 'birthMonth', 'birthDay'].includes(fieldName)) {
      if (formData.birthYear && formData.birthMonth && formData.birthDay) {
        const birthdate = new Date(
          parseInt(formData.birthYear),
          parseInt(formData.birthMonth) - 1,
          parseInt(formData.birthDay)
        );
        
        if (!isNaN(birthdate.getTime())) {
          set({ birthday: birthdate });
        } else {
          set({ birthday: null });
        }
      }
    }
  },
  
  togglePasswordVisibility: () => set((state) => ({ showPassword: !state.showPassword })),
  togglePinVisibility: () => set((state) => ({ showPin: !state.showPin })),
  
  setError: (error) => set({ error }),
  
  // Validation functions
  validateStage1: () => {
    const { formData, birthday, setError, setStage } = get();
    
    if (!formData.firstName.trim()) {
      setError('First name is required');
      return false;
    }
    if (!formData.surname.trim()) {
      setError('Surname is required');
      return false;
    }
    if (!formData.sexualOrientation) {
      setError('Please select your sexual orientation');
      return false;
    }
    if (!birthday) {
      setError('Please enter a valid date of birth');
      return false;
    }
    
    setStage(2);
    setError('');
    return true;
  },
  
  validateStage2: () => {
    const { formData, setError, setStage } = get();
    
    // Email validation
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    // Password validation
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    setStage(3);
    setError('');
    return true;
  },
  
  validateStage3: () => {
    const { formData, setError, setStage } = get();
    
    if (!/^\d{4}$/.test(formData.pin)) {
      setError('PIN must be exactly 4 digits');
      return false;
    }
    
    setStage(4);
    setError('');
    return true;
  },
  
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
    const { formData, setError, setLoading, birthday, calculateAge, fullName } = get();
    
    // Validate PIN
    if (!/^\d{4}$/.test(formData.pin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }
    
    // Validate security phrase and answer
    if (formData.securityPhrase.trim().length < 10) {
      setError('Security phrase must be at least 10 characters long');
      return;
    }
    
    if (!formData.securityAnswer.trim()) {
      setError('Security answer is required');
      return;
    }
    
    try {
      set({ loading: true });
      
      // Prepare data for API
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
      
      // Use Zustand store function to create user
      const result = await createUser(userData);
      
      if (result.success) {
        // Redirect to login page or dashboard
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
  resetForm: () => set({
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
  })
}));

export default useRegisterStore;