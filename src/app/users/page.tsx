const handleSaveUser = async (userData) => {
  try {
    const response = await axios.post('/api/users', userData);
    // Handle successful response
  } catch (error) {
    if (error.response?.data?.details) {
      console.error('Validation errors:', error.response.data.details);
    }
    console.error('[UsersPage] Failed to save user', error);
    // Handle error
  }
};