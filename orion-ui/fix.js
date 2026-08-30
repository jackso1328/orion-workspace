const fs = require('fs');
let content = fs.readFileSync('src/components/PomodoroModule.tsx', 'utf8');
const splitPoint = content.indexOf('            {/* Controls */}');
const topHalf = content.slice(0, splitPoint);
const bottomHalf = "            {/* Controls */}
            <div className="timer-controls">
              <button 
                className={\control-btn primary \\} 
                onClick={toggleTimer} 
                style={{ backgroundColor: modeColor }}
              >
                {isActive ? <Pause size={28} /> : <Play size={28} />}
              </button>
              <button className="control-btn secondary" onClick={resetTimer}>
                <RotateCcw size={24} />
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
";
fs.writeFileSync('src/components/PomodoroModule.tsx', topHalf + bottomHalf);
