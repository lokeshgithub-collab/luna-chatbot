import React, { useState, useEffect } from 'react';

const JOURNAL_STORAGE_KEY = 'lunaJournalEntries';

const Journal = () => {
  const [entry, setEntry] = useState('');
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    const storedEntries = localStorage.getItem(JOURNAL_STORAGE_KEY);
    if (storedEntries) {
      setEntries(JSON.parse(storedEntries));
    }
  }, []);

  const handleSave = () => {
    if (!entry.trim()) return; 

    const newEntry = {
      id: Date.now(), 
      text: entry,
      timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) 
    };

    const updatedEntries = [newEntry, ...entries]; 
    setEntries(updatedEntries);
    localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(updatedEntries));
    setEntry(''); 
  };

  const handleDelete = (idToDelete) => {
     const updatedEntries = entries.filter(e => e.id !== idToDelete);
     setEntries(updatedEntries);
     localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(updatedEntries));
  };


  return (
    <div className="journal-container">
      <h2>My Private Journal</h2>
      <textarea
        value={entry}
        onChange={(e) => setEntry(e.target.value)}
        placeholder="Write down your thoughts and feelings..."
        rows="8"
      />
      <button className="save-button" onClick={handleSave}>Save Entry</button>

      <div className="past-entries">
        <h3>Past Entries</h3>
        {entries.length === 0 ? (
          <p>No entries yet. Start writing!</p>
        ) : (
          entries.map((e) => (
            <div key={e.id} className="journal-entry">
              <p className="entry-timestamp">{e.timestamp}</p>
              <p>{e.text}</p>
               <button className="delete-button" onClick={() => handleDelete(e.id)}>Delete</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Journal;