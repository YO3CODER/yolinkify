

type WrapperProps = {
    children: React.ReactNode; 
}

import React from 'react'
import Navbar from './Navbar';
import { ToastContainer } from 'react-toastify/unstyled';

const wrapper = ({ children }: WrapperProps) => {
  return (
    <div data-theme="night" >
        <Navbar />
      <div className='px-5 md:px-[10%] mt-4 mb-10'>
        <ToastContainer 
        position="top-right" 
        autoClose={5000} 
        hideProgressBar={false} 
        newestOnTop={false} 
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        
        
        />
         {children} 
      </div> 
    </div>
  )
}

export default wrapper
