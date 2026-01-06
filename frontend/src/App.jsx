import Journal from './journal.jsx'; 
import Tracker from './tracker.jsx'; 
import Resources from './resources.jsx'; 
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './index.css';
import BreathingExercise from './BreathingExercise.jsx';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const mic = new SpeechRecognition();
mic.continuous = true;
mic.interimResults = true;
mic.lang = 'en-US';


const getSessionId = () => {
  let sessionId = localStorage.getItem('lunaSessionId');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('lunaSessionId', sessionId);
  }
  return sessionId;
};

function App() {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showBreathingExercise, setShowBreathingExercise] = useState(false);
  const chatEndRef = useRef(null);
  const [sessionId] = useState(getSessionId());
  const [isListening, setIsListening] = useState(false);
  
  const [voices, setVoices] = useState([]);
  const [currentView, setCurrentView] = useState('chat');

  const abortControllerRef = useRef(null);

  
  useEffect(() => {
    const handleListen = () => {
      if (isListening) {
        mic.start();
        mic.onend = () => {
          if (isListening) mic.start();
        };
      } else {
        mic.stop();
        mic.onend = () => {};
      }
      mic.onstart = () => console.log('Mics on');
      mic.onresult = event => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        setMessage(transcript);
        mic.onerror = event => console.log(event.error);
      };
    };
    handleListen();
  }, [isListening]);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
      }
    };
    speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices(); 
  }, []);


  
  const speak = (text) => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    const femaleVoice = voices.find(voice => voice.name === 'Google UK English Female');

    if (femaleVoice) {
      utterance.voice = femaleVoice;
    } else {
      utterance.lang = 'en-US';
    }
    
    speechSynthesis.speak(utterance);
  };
  
  const MOOD_STORAGE_KEY = 'lunaMoodTracker';

  const logMoodFromChat = (sentiment) => {
    
    let moodValue;
    if (sentiment.includes('negative')) {
      moodValue = 1; // Sad
    } else if (sentiment.includes('positive')) {
      moodValue = 3; // Happy
    } else {
      moodValue = 2; // Neutral
    }

    const newMood = {
      id: Date.now(),
      value: moodValue,
      timestamp: new Date().toISOString()
    };
    
    const today = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });

    const storedMoods = localStorage.getItem(MOOD_STORAGE_KEY);
    let allMoods = [];
    if (storedMoods) {
      allMoods = JSON.parse(storedMoods);
    }

    const todayEntryIndex = allMoods.findIndex(mood => {
       const entryDate = new Date(mood.timestamp).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
       return entryDate === today;
    });
    
    if (todayEntryIndex !== -1) {
      allMoods[todayEntryIndex] = newMood;
    } else {
      allMoods.unshift(newMood);
    }

    localStorage.setItem(MOOD_STORAGE_KEY, JSON.stringify(allMoods));
    console.log("Automatically logged mood:", moodValue); 
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  useEffect(() => {
    const initialMessage = {
      role: "assistant",
      content: "Hi, I'm Luna. I'm here to listen whenever you're ready to share. How are you feeling today?"
    };
    setChatHistory([initialMessage]);
    setTimeout(() => speak(initialMessage.content), 100);
  }, [voices]); 

 
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;
    handleSend(message); 
    setMessage(''); 
  };

  
  const handleSend = async (messageText) => {
    if (isLoading) return; 

    if (isListening) setIsListening(false); 

   
    abortControllerRef.current = new AbortController();

    const userMessage = { role: 'user', content: messageText };
    const updatedHistoryWithUser = [...chatHistory, userMessage];
    setChatHistory(updatedHistoryWithUser);
    
    setIsLoading(true);

    try {
     const response = await axios.post(
  `${import.meta.env.VITE_API_URL}/chat`,
  {
    sessionId: sessionId,
    message: messageText,
  },
  {
    signal: abortControllerRef.current.signal
  }
);

      const lunaReply = { role: 'assistant', content: response.data.reply };
      
      
      if (response.data.sentiment) {
        logMoodFromChat(response.data.sentiment);
      }

      setChatHistory([...updatedHistoryWithUser, lunaReply]);
      speak(response.data.reply);

    } catch (error) {
      if (axios.isCancel(error)) {
        console.log('Request canceled by user.');
        setChatHistory(prev => prev.slice(0, -1));
      } else {
        console.error('Error fetching response from server:', error);
        const errorReply = {
          role: 'assistant',
          content: "I'm having a little trouble connecting right now. Please try again in a moment."
        };
        if (!axios.isCancel(error)) {
            setChatHistory([...updatedHistoryWithUser, errorReply]);
            speak(errorReply.content);
        }
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null; 
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      console.log("Stop button clicked, aborting request...");
    }
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>Luna</h1>
        <p>Your Empathetic AI Companion</p>
      </div>

      <div className="navigation">
        <button
          className={currentView === 'chat' ? 'active' : ''}
          onClick={() => setCurrentView('chat')}
        >
          Chat
        </button>
        <button
          className={currentView === 'journal' ? 'active' : ''}
          onClick={() => setCurrentView('journal')}
        >
          Journal
        </button>
        <button
          className={currentView === 'tracker' ? 'active' : ''}
          onClick={() => setCurrentView('tracker')}
        >
          Tracker
        </button>
        {}
        <button
          className={currentView === 'resources' ? 'active' : ''}
          onClick={() => setCurrentView('resources')}
        >
          Resources
        </button>
      </div>

      {}
      {currentView === 'chat' ? (
        
        <>
          <div className="chat-window">
            {chatHistory.map((msg, index) => (
              <div key={index} className={`message ${msg.role === 'user' ? 'user-message' : 'luna-message'}`}>
                <p>{msg.content}</p>
              </div>
            ))}
            {isLoading && <div className="message luna-message typing-indicator"><span></span><span></span><span></span></div>}
            <div ref={chatEndRef} />
          </div>
          <div className="wellness-tools">
            <button onClick={() => setShowBreathingExercise(true)}>
              🧘 Try a Breathing Exercise
            </button>
          </div>
          
          {chatHistory.length <= 1 && (
            <div className="suggestion-chips">
              <button onClick={() => handleSend("I had a bad day")}>
                "I had a bad day"
              </button>
              <button onClick={() => handleSend("I'm feeling stressed")}>
                "I'm feeling stressed"
              </button>
              <button onClick={() => handleSend("Just want to chat")}>
                "Just want to chat"
              </button>
            </div>
          )}

          <form className="chat-form" onSubmit={handleSubmit}>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell me what's on your mind..."
              disabled={isLoading}
            />
            <button
              type="button"
              className={`mic-button ${isListening ? 'listening' : ''}`}
              onClick={() => setIsListening(prevState => !prevState)}
              disabled={isLoading} 
            >
              🎤
            </button>
            
            {isLoading ? (
              <button
                type="button"
                className="stop-button"
                onClick={handleStop}
              >
                ■ Stop
              </button>
            ) : (
              <button type="submit" disabled={!message.trim()}>
                Send
              </button>
            )}
            
          </form>
        </>
      ) : currentView === 'journal' ? (
        
        <Journal />
      ) : currentView === 'tracker' ? (
       
        <Tracker />
      ) : (
        
        <Resources />
      )}
      {}
      
      {showBreathingExercise && <BreathingExercise onClose={() => setShowBreathingExercise(false)} />}
    </div>
  );
}

export default App;