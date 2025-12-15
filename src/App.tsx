import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CheckoutForm from './components/Checkout/CheckoutForm';
import EventTester from './components/EventTester/EventTester';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CheckoutForm />} />
        <Route path="/checkout" element={<CheckoutForm />} />
        <Route path="/test" element={<EventTester />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
