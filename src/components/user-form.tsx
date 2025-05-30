const handleSubmit = async (values) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Submitting user data:', values);
  }
  try {
    await onSave({
      name: values.name.trim(),
      email: values.email.trim(),
      password: values.password,
      role: values.role
    });
  } catch (error) {
    console.error('Form submission error:', error);
  }
};