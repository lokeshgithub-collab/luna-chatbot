import React from 'react';

const Resources = () => {
  return (
    <div className="resources-container">
      <h2>Helpful Resources</h2>
      <p className="resources-subtitle">
        Please note: Luna is an AI companion, not a replacement for a medical professional. If you are in crisis, please use the resources below.
      </p>

      <div className="resource-list">
        <h3>Crisis Helplines (India)</h3>
        <div className="resource-item">
          <h4>Vandrevala Foundation</h4>
          <p>A 24/7 helpline for anyone feeling distressed, depressed, or suicidal.</p>
          <p className="resource-contact">Phone: 9999666555</p>
        </div>
        <div className="resource-item">
          <h4>iCALL Psychosocial Helpline</h4>
          <p>A telephone and email-based counseling service run by the Tata Institute of Social Sciences (TISS).</p>
          <p className="resource-contact">Phone: 9152987821</p>
        </div>
        <div className="resource-item">
          <h4>Kiran Helpline (Govt. of India)</h4>
          <p>A national 24/7 toll-free helpline for mental health support.</p>
          <p className="resource-contact">Phone: 1800-599-0019</p>
        </div>

        <h3>Online Reading & Tools</h3>
        <div className="resource-item">
          <h4>NIMH (National Institute of Mental Health)</h4>
          <p>Detailed information on mental health disorders, a range of topics, and the latest research.</p>
          <a href="https://www.nimh.nih.gov/health/topics" target="_blank" rel="noopener noreferrer">Visit Website</a>
        </div>
        <div className="resource-item">
          <h4>Headspace (App)</h4>
          <p>A popular application for guided meditation and mindfulness exercises.</p>
          <a href="https://www.headspace.com/" target="_blank" rel="noopener noreferrer">Visit Website</a>
        </div>
        <div className="resource-item">
          <h4>Calm (App)</h4>
          <p>An app for sleep, meditation, and relaxation, with a variety of guided programs.</p>
          <a href="https://www.calm.com/" target="_blank" rel="noopener noreferrer">Visit Website</a>
        </div>
      </div>
    </div>
  );
};

export default Resources;