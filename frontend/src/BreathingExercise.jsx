import React, { useState, useEffect } from 'react';

const SESSION_DURATION = 120000; 

const BreathingExercise = ({ onClose }) => {
  const [instruction, setInstruction] = useState('Get Ready...');
  const [timer, setTimer] = useState(10); 
  const [isComplete, setIsComplete] = useState(false);

  const startExercise = () => {
    setIsComplete(false);
    setInstruction('Get Ready...');
    setTimer(10); 

    const instructions = ['Inhale', 'Hold', 'Exhale', 'Hold'];
    let instructionIndex = 0;

    const countdownInterval = setInterval(() => {
      setTimer(prev => (prev > 1 ? prev - 1 : 10)); 
    }, 1000);

    const instructionInterval = setInterval(() => {
      instructionIndex = (instructionIndex + 1) % instructions.length;
      setInstruction(instructions[instructionIndex]);
    }, 10000); 
    
    const sessionTimeout = setTimeout(() => {
      setIsComplete(true);
      clearInterval(countdownInterval);
      clearInterval(instructionInterval);
    }, SESSION_DURATION);

    const startTimeout = setTimeout(() => {
      setInstruction(instructions[0]);
    }, 2000);

    return () => {
      clearInterval(countdownInterval);
      clearInterval(instructionInterval);
      clearTimeout(sessionTimeout);
      clearTimeout(startTimeout);
    };
  };

  useEffect(() => {
    const cleanup = startExercise();
    return cleanup;
  }, []);

  const handleRestart = () => {
    const cleanup = startExercise();
  };

  return (
    <div className="breathing-overlay">
      {!isComplete ? (
        <div className="breathing-container">
          <p className="breathing-text">{instruction}</p>
          <div className="breathing-circle">
            <span className="breathing-timer">{timer}</span>
          </div>
          <button className="close-button" onClick={onClose}>End Early</button>
        </div>
      ) : (
        <div className="breathing-container completion-popup">
          <h3>Well Done!</h3>
          <p>You have waved out the stress in your body through this breathing exercise.</p>
          <div className="completion-buttons">
            <button className="btn-primary" onClick={handleRestart}>Do Again</button>
            <button className="btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BreathingExercise;