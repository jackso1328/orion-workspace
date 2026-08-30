import { useState } from "react";
import { Brain, Layers, Plus, ArrowLeft } from "lucide-react";
import { useOrionStore } from "../store/useOrionStore";
import { isPast } from "date-fns";

export default function FlashcardsModule() {
  const decks = useOrionStore(state => state.flashcardDecks) || [];
  const flashcards = useOrionStore(state => state.flashcards) || [];
  const updateFlashcardReview = useOrionStore(state => state.updateFlashcardReview);

  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const activeDeck = decks.find(d => d.id === activeDeckId);
  const deckCards = activeDeck ? flashcards.filter(c => c.deckId === activeDeck.id) : [];
  
  // Cards due are ones where nextReviewDate is in the past
  const dueCards = deckCards.filter(c => isPast(new Date(c.nextReviewDate)));
  
  const handleStartReview = (deckId: string) => {
    setActiveDeckId(deckId);
    setReviewMode(true);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  const handleRating = (quality: number) => {
    const currentCard = dueCards[currentCardIndex];
    if (currentCard) {
      updateFlashcardReview(currentCard.id, quality);
    }
    
    // Move to next card
    if (currentCardIndex + 1 < dueCards.length) {
      setCurrentCardIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      // Review complete
      setReviewMode(false);
    }
  };

  if (reviewMode && activeDeck) {
    if (dueCards.length === 0) {
      return (
        <div className="flashcards-module center-all">
          <div className="empty-state">
            <Brain size={48} color="var(--accent-teal)" />
            <h2>You're all caught up!</h2>
            <p>No more cards due for {activeDeck.title} today.</p>
            <button className="btn-primary" onClick={() => setReviewMode(false)} style={{ marginTop: '16px' }}>Back to Decks</button>
          </div>
        </div>
      );
    }

    const currentCard = dueCards[currentCardIndex];

    return (
      <div className="flashcards-module review-mode">
        <header className="review-header">
          <button className="icon-btn" onClick={() => setReviewMode(false)}>
            <ArrowLeft size={20} />
          </button>
          <h2>{activeDeck.title}</h2>
          <span className="review-progress">{currentCardIndex + 1} / {dueCards.length} Due</span>
        </header>

        <div className="flashcard-container" onClick={() => setIsFlipped(!isFlipped)}>
          <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>
            <div className="flashcard-front">
              {currentCard.front}
            </div>
            <div className="flashcard-back">
              {currentCard.back}
            </div>
          </div>
        </div>

        {isFlipped ? (
          <div className="review-controls">
            <button className="rating-btn again" onClick={(e) => { e.stopPropagation(); handleRating(1); }}>
              <span className="label">Again</span>
              <span className="sub">1 min</span>
            </button>
            <button className="rating-btn hard" onClick={(e) => { e.stopPropagation(); handleRating(3); }}>
              <span className="label">Hard</span>
              <span className="sub">1 day</span>
            </button>
            <button className="rating-btn good" onClick={(e) => { e.stopPropagation(); handleRating(4); }}>
              <span className="label">Good</span>
              <span className="sub">{Math.max(1, Math.round(currentCard.interval * 1.5))} d</span>
            </button>
            <button className="rating-btn easy" onClick={(e) => { e.stopPropagation(); handleRating(5); }}>
              <span className="label">Easy</span>
              <span className="sub">{Math.max(1, Math.round(currentCard.interval * 2.5))} d</span>
            </button>
          </div>
        ) : (
          <div className="review-controls-placeholder">
            <p>Click the card to reveal the answer</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flashcards-module">
      <div className="flashcards-container">
        <header className="flashcards-header">
          <div>
            <h1>Spaced Repetition</h1>
            <p className="subtitle">Master concepts with scientifically optimized intervals.</p>
          </div>
          <button className="btn-primary">
            <Plus size={16} /> New Deck
          </button>
        </header>

        <div className="decks-grid">
          {decks.map(deck => {
            const allCards = flashcards.filter(c => c.deckId === deck.id);
            const due = allCards.filter(c => isPast(new Date(c.nextReviewDate)));
            
            return (
              <div key={deck.id} className="deck-card" style={{ borderTopColor: deck.color }}>
                <div className="deck-info">
                  <div className="deck-icon" style={{ backgroundColor: `${deck.color}20`, color: deck.color }}>
                    <Layers size={24} />
                  </div>
                  <div className="deck-text">
                    <h3>{deck.title}</h3>
                    <p>{allCards.length} Total Cards</p>
                  </div>
                </div>
                
                <div className="deck-actions">
                  <div className="due-badge">
                    <span className="due-count">{due.length}</span>
                    <span className="due-label">Due</span>
                  </div>
                  
                  <button 
                    className="start-review-btn" 
                    disabled={due.length === 0}
                    onClick={() => handleStartReview(deck.id)}
                    style={{ 
                      backgroundColor: due.length > 0 ? deck.color : 'var(--bg-sidebar)',
                      color: due.length > 0 ? 'white' : 'var(--text-muted)'
                    }}
                  >
                    Review Now
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
