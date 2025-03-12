import { Battle, Pokemon, Side } from '@pkmn/client';
import { GenerationNum, Generations } from '@pkmn/data';
import { GraphicsGen, Icons, Sprites } from '@pkmn/img';
import { ArgName, ArgType, BattleArgsKWArgType, Handler, Protocol } from '@pkmn/protocol';
import { TeamGenerators } from '@pkmn/randoms';
import { Data, PokemonSet, Teams } from '@pkmn/sets';
import { BattleStreams, Teams as DTeams, Dex, PRNG, RandomPlayerAI, TeamValidator } from '@pkmn/sim';
import { LogFormatter } from '@pkmn/view';

const prng = new PRNG();
const FORMAT = 'gen3randombattle';
const validator = new TeamValidator(FORMAT);

const dex = Dex.forFormat(FORMAT);
const gens = new Generations(Dex as any);

const SPRITES: { [gen in GenerationNum]: GraphicsGen[] } = {
  1: ['gen1rg', 'gen1rb', 'gen1'],
  2: ['gen2g', 'gen2s', 'gen2'],
  3: ['gen3rs', 'gen3frlg', 'gen3', 'gen3-2'],
  4: ['gen4dp', 'gen4dp-2', 'gen4'],
  5: ['gen5', 'gen5ani'],
  6: ['ani'],
  7: ['ani'],
  8: ['ani'],
  9: ['ani'],
};
const GEN = +FORMAT.charAt(3) as GenerationNum;
DTeams.setGeneratorFactory(TeamGenerators);
const GRAPHICS = prng.sample(SPRITES[GEN]);

const spec = { formatid: FORMAT };
const p1spec = {
  name: 'Player 1',
};
const p2spec = {
  name: 'Player 2',
};

const streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());

// Create a custom player class that doesn't automatically make moves
class ManualPlayer {
  stream: any;
  log: string[] = [];
  debug: boolean;
  currentRequest: any = null;
  playerName: string;

  constructor(playerStream: any, debug = false, playerName = 'Unknown') {
    this.stream = playerStream;
    this.debug = debug;
    this.playerName = playerName;

    void this.startListening();
  }

  async startListening() {
    try {
      for await (const chunk of this.stream) {
        this.receive(chunk);
      }
    } catch (error) {
      console.error(`${this.playerName} stream error:`, error);
    }
  }

  receive(chunk: string) {
    if (this.debug) console.log(`${this.playerName} received:`, chunk);

    for (const line of chunk.split('\n')) {
      this.receiveLine(line);
    }
  }

  receiveLine(line: string) {
    if (this.debug) console.log(`${this.playerName} line:`, line);
    if (!line.startsWith('|')) return;

    const [cmd, rest] = line.slice(1).split('|', 1)[0] === ''
      ? ['', line.slice(1)]
      : [line.slice(1).split('|', 1)[0], line.slice(line.indexOf('|', 1) + 1)];

    if (cmd === 'request') {
      try {
        const request = JSON.parse(rest);
        this.receiveRequest(request);
      } catch (e) {
        console.error(`${this.playerName} error parsing request:`, e, rest);
      }
      return;
    }

    if (cmd === 'faint') {
      this.handleFaint(rest);
      return;
    }

    if (cmd === 'error') {
      this.receiveError(new Error(rest));
      return;
    }

    this.log.push(line);
  }

  receiveError(error: Error) {
    console.error(`${this.playerName} battle error:`, error);

    // If we made an unavailable choice we will receive a followup request to
    // allow us the opportunity to correct our decision.
    if (error.message.startsWith('[Unavailable choice]')) return;
  }

  handleFaint(pokemonId: string): void {
    console.log(`${pokemonId} has fainted!`);
    
    // Update the HP display to show 0 HP
    const pokemonSide = pokemonId.split('a')[0]; // Extract p1 or p2
    const playerName = pokemonSide === 'p1' ? 'Player1' : 'Player2';
    const controlsDiv = document.getElementById(`${playerName.toLowerCase()}-controls`);
    
    if (controlsDiv) {
      // Find the HP display and update it to 0
      const hpValue = controlsDiv.querySelector('.hp-value') as HTMLElement;
      if (hpValue) {
        const maxHP = hpValue.textContent?.split('/')[1] || '100';
        hpValue.textContent = `0/${maxHP}`;
      }
      
      // Update the HP bar
      const hpBarInner = controlsDiv.querySelector('.hp-bar-inner') as HTMLElement;
      if (hpBarInner) {
        hpBarInner.style.width = '0%';
        hpBarInner.style.backgroundColor = '#F08030'; // Red
      }
    }
    
    // End the game
    this.endGame(pokemonId);
  }

  endGame(faintedPokemonId: string): void {
    const winner = faintedPokemonId.startsWith('p1') ? 'Player 2' : 'Player 1';
    const loser = faintedPokemonId.startsWith('p1') ? 'Player 1' : 'Player 2';
    
    // Update the battle info display
    const statusDisplay = document.getElementById('status-display');
    if (statusDisplay) {
      statusDisplay.textContent = `${winner} has won the battle!`;
      statusDisplay.style.color = '#4CAF50';
      statusDisplay.style.fontWeight = 'bold';
    }
    
    // Create a styled game over overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '1000';
    
    const gameOverCard = document.createElement('div');
    gameOverCard.style.backgroundColor = 'white';
    gameOverCard.style.borderRadius = '10px';
    gameOverCard.style.padding = '30px';
    gameOverCard.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.3)';
    gameOverCard.style.textAlign = 'center';
    gameOverCard.style.maxWidth = '400px';
    gameOverCard.style.width = '80%';
    
    const gameOverTitle = document.createElement('h2');
    gameOverTitle.textContent = 'Battle Finished!';
    gameOverTitle.style.color = '#333';
    gameOverTitle.style.marginBottom = '20px';
    gameOverTitle.style.fontSize = '28px';
    
    const resultText = document.createElement('p');
    resultText.innerHTML = `<strong>${winner}</strong> has defeated <strong>${loser}</strong>!`;
    resultText.style.fontSize = '18px';
    resultText.style.marginBottom = '25px';
    
    const playAgainButton = document.createElement('button');
    playAgainButton.textContent = 'Play Again';
    playAgainButton.style.backgroundColor = '#4CAF50';
    playAgainButton.style.color = 'white';
    playAgainButton.style.border = 'none';
    playAgainButton.style.padding = '10px 20px';
    playAgainButton.style.borderRadius = '5px';
    playAgainButton.style.fontSize = '16px';
    playAgainButton.style.cursor = 'pointer';
    playAgainButton.style.transition = 'background-color 0.3s';
    playAgainButton.onclick = () => {
      location.reload();
    };
    
    playAgainButton.onmouseover = () => {
      playAgainButton.style.backgroundColor = '#45a049';
    };
    
    playAgainButton.onmouseout = () => {
      playAgainButton.style.backgroundColor = '#4CAF50';
    };
    
    gameOverCard.appendChild(gameOverTitle);
    gameOverCard.appendChild(resultText);
    gameOverCard.appendChild(playAgainButton);
    overlay.appendChild(gameOverCard);
    
    document.body.appendChild(overlay);
    
    // Disable all move buttons
    const moveButtons = document.querySelectorAll('.move-card');
    moveButtons.forEach(button => {
      (button as HTMLElement).style.pointerEvents = 'none';
      (button as HTMLElement).style.opacity = '0.5';
    });
  }

  receiveRequest(request: any): void {
    this.currentRequest = request;
    console.log(`${this.playerName} received request:`, request);

    // Only handle active moves
    if (request.active) {
      this.displayAvailableMoves(request);
    }
  }

  displayAvailableMoves(request: any): void {
    const moveOptions = document.createElement('div');
    moveOptions.className = 'move-options';
    moveOptions.innerHTML = `<h3>${this.playerName} - Choose a move:</h3>`;

    request.active.forEach((active: any, i: number) => {
      if (!active) return;

      const pokemon = request.side.pokemon[i];
      if (pokemon.condition.endsWith(' fnt')) return;

      const pokemonDiv = document.createElement('div');
      pokemonDiv.style.border = '1px solid #ddd';
      pokemonDiv.style.borderRadius = '8px';
      pokemonDiv.style.padding = '15px';
      pokemonDiv.style.marginBottom = '20px';
      pokemonDiv.style.backgroundColor = '#f9f9f9';

      // Parse the condition to get HP and status
      const condition = pokemon.condition;
      let currentHP = 0;
      let maxHP = 0;
      let status = '';

      if (condition.includes('/')) {
        const parts = condition.split(' ');
        const hpParts = parts[0].split('/');
        currentHP = parseInt(hpParts[0]);
        maxHP = parseInt(hpParts[1]);

        if (parts.length > 1) {
          status = parts[1];
        }
      }

      // Create Pokémon header with name, level, gender
      const pokemonHeader = document.createElement('div');
      pokemonHeader.style.display = 'flex';
      pokemonHeader.style.justifyContent = 'space-between';
      pokemonHeader.style.alignItems = 'center';
      pokemonHeader.style.marginBottom = '10px';

      // Parse details to get species, level, gender
      const details = pokemon.details;
      const detailsParts = details.split(', ');
      const species = detailsParts[0];
      const level = detailsParts.find((p: string) => p.startsWith('L'))?.substring(1) || '100';
      const gender = detailsParts.find((p: string) => p === 'M' || p === 'F') || '';

      const nameDisplay = document.createElement('h4');
      nameDisplay.style.margin = '0';
      nameDisplay.innerHTML = `${species} <span style="font-weight: normal;">Lv.${level} ${gender}</span>`;

      pokemonHeader.appendChild(nameDisplay);

      // Create HP bar
      const hpBarContainer = document.createElement('div');
      hpBarContainer.style.marginBottom = '15px';

      const hpLabel = document.createElement('div');
      hpLabel.style.display = 'flex';
      hpLabel.style.justifyContent = 'space-between';
      hpLabel.style.marginBottom = '5px';

      const hpText = document.createElement('span');
      hpText.textContent = 'HP:';
      hpText.style.fontWeight = 'bold';

      // Add class to HP value for easier selection
      const hpValue = document.createElement('span');
      hpValue.textContent = `${currentHP}/${maxHP}`;
      hpValue.className = 'hp-value';

      hpLabel.appendChild(hpText);
      hpLabel.appendChild(hpValue);

      const hpBarOuter = document.createElement('div');
      hpBarOuter.style.height = '10px';
      hpBarOuter.style.width = '100%';
      hpBarOuter.style.backgroundColor = '#e0e0e0';
      hpBarOuter.style.borderRadius = '5px';
      hpBarOuter.style.overflow = 'hidden';

      const hpPercentage = (currentHP / maxHP) * 100;
      let hpColor = '#78C850'; // Green
      if (hpPercentage <= 50) hpColor = '#F8D030'; // Yellow
      if (hpPercentage <= 20) hpColor = '#F08030'; // Red

      const hpBarInner = document.createElement('div');
      hpBarInner.className = 'hp-bar-inner';
      hpBarInner.style.height = '100%';
      hpBarInner.style.width = `${hpPercentage}%`;
      hpBarInner.style.backgroundColor = hpColor;

      hpBarOuter.appendChild(hpBarInner);
      hpBarContainer.appendChild(hpLabel);
      hpBarContainer.appendChild(hpBarOuter);

      // Display status if any
      if (status) {
        const statusDisplay = document.createElement('div');
        statusDisplay.style.marginBottom = '10px';
        statusDisplay.style.padding = '3px 8px';
        statusDisplay.style.borderRadius = '4px';
        statusDisplay.style.display = 'inline-block';
        statusDisplay.style.fontSize = '0.9em';
        statusDisplay.style.fontWeight = 'bold';

        // Set status color
        switch (status.toLowerCase()) {
          case 'par':
            statusDisplay.style.backgroundColor = '#F8D030';
            statusDisplay.textContent = 'Paralyzed';
            break;
          case 'psn':
            statusDisplay.style.backgroundColor = '#A040A0';
            statusDisplay.style.color = 'white';
            statusDisplay.textContent = 'Poisoned';
            break;
          case 'tox':
            statusDisplay.style.backgroundColor = '#A040A0';
            statusDisplay.style.color = 'white';
            statusDisplay.textContent = 'Badly Poisoned';
            break;
          case 'brn':
            statusDisplay.style.backgroundColor = '#F08030';
            statusDisplay.style.color = 'white';
            statusDisplay.textContent = 'Burned';
            break;
          case 'slp':
            statusDisplay.style.backgroundColor = '#A8A878';
            statusDisplay.textContent = 'Asleep';
            break;
          case 'frz':
            statusDisplay.style.backgroundColor = '#98D8D8';
            statusDisplay.textContent = 'Frozen';
            break;
          default:
            statusDisplay.style.backgroundColor = '#555555';
            statusDisplay.style.color = 'white';
            statusDisplay.textContent = status;
        }

        const statusContainer = document.createElement('div');
        statusContainer.appendChild(statusDisplay);
        hpBarContainer.appendChild(statusContainer);
      }

      // Add stats display if available
      if (pokemon.stats) {
        const statsContainer = document.createElement('div');
        statsContainer.style.display = 'grid';
        statsContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
        statsContainer.style.gap = '5px';
        statsContainer.style.marginBottom = '15px';
        statsContainer.style.fontSize = '0.9em';

        const statNames = {
          atk: 'Attack',
          def: 'Defense',
          spa: 'Sp. Atk',
          spd: 'Sp. Def',
          spe: 'Speed'
        };

        for (const [stat, value] of Object.entries(pokemon.stats)) {
          if (stat === 'hp') continue; // Skip HP as we already display it

          const statDisplay = document.createElement('div');
          statDisplay.innerHTML = `<span style="font-weight: bold;">${statNames[stat as keyof typeof statNames] || stat}:</span> ${value}`;
          statsContainer.appendChild(statDisplay);
        }

        pokemonDiv.appendChild(pokemonHeader);
        pokemonDiv.appendChild(hpBarContainer);
        pokemonDiv.appendChild(statsContainer);
      } else {
        pokemonDiv.appendChild(pokemonHeader);
        pokemonDiv.appendChild(hpBarContainer);
      }

      // Create a styled container for moves
      const movesContainer = document.createElement('div');
      movesContainer.style.display = 'grid';
      movesContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
      movesContainer.style.gap = '8px';
      movesContainer.style.marginTop = '10px';

      // Add move buttons with detailed information
      active.moves.forEach((move: any, j: number) => {
        // Get move details from the dex
        const moveData = dex.moves.get(move.id || move.move);

        // Create a styled move card
        const moveCard = document.createElement('div');
        moveCard.className = 'move-card';
        moveCard.style.border = move.disabled ? '1px solid #ccc' : '1px solid #4CAF50';
        moveCard.style.borderRadius = '4px';
        moveCard.style.padding = '8px';
        moveCard.style.backgroundColor = move.disabled ? '#f5f5f5' : '#e8f5e9';
        moveCard.style.cursor = move.disabled ? 'not-allowed' : 'pointer';
        moveCard.style.opacity = move.disabled ? '0.7' : '1';

        // Set move type background color
        const typeColors: { [key: string]: string } = {
          normal: '#A8A878', fighting: '#C03028', flying: '#A890F0', poison: '#A040A0',
          ground: '#E0C068', rock: '#B8A038', bug: '#A8B820', ghost: '#705898',
          steel: '#B8B8D0', fire: '#F08030', water: '#6890F0', grass: '#78C850',
          electric: '#F8D030', psychic: '#F85888', ice: '#98D8D8', dragon: '#7038F8',
          dark: '#705848', fairy: '#EE99AC'
        };

        const typeBadge = document.createElement('span');
        typeBadge.textContent = moveData.type;
        typeBadge.style.backgroundColor = typeColors[moveData.type.toLowerCase()] || '#888888';
        typeBadge.style.color = '#fff';
        typeBadge.style.padding = '2px 6px';
        typeBadge.style.borderRadius = '4px';
        typeBadge.style.fontSize = '0.8em';
        typeBadge.style.display = 'inline-block';

        // Create move header with name and type
        const moveHeader = document.createElement('div');
        moveHeader.style.display = 'flex';
        moveHeader.style.justifyContent = 'space-between';
        moveHeader.style.alignItems = 'center';
        moveHeader.style.marginBottom = '5px';

        const moveName = document.createElement('strong');
        moveName.textContent = move.move;

        moveHeader.appendChild(moveName);
        moveHeader.appendChild(typeBadge);

        // Create move stats
        const moveStats = document.createElement('div');
        moveStats.style.fontSize = '0.9em';
        moveStats.style.display = 'grid';
        moveStats.style.gridTemplateColumns = 'repeat(3, 1fr)';

        // PP display
        const ppDisplay = document.createElement('div');
        ppDisplay.innerHTML = `<span style="font-weight: bold;">PP:</span> ${move.pp}/${move.maxpp}`;

        // Power display
        const powerDisplay = document.createElement('div');
        powerDisplay.innerHTML = `<span style="font-weight: bold;">Pow:</span> ${moveData.basePower || '-'}`;

        // Accuracy display
        const accDisplay = document.createElement('div');
        accDisplay.innerHTML = `<span style="font-weight: bold;">Acc:</span> ${moveData.accuracy === true ? '-' : moveData.accuracy}`;

        moveStats.appendChild(ppDisplay);
        moveStats.appendChild(powerDisplay);
        moveStats.appendChild(accDisplay);

        // Add category icon (physical/special/status)
        const categoryDisplay = document.createElement('div');
        categoryDisplay.style.marginTop = '5px';
        categoryDisplay.style.fontSize = '0.8em';

        // In Gen 3, category is determined by type
        const physicalTypes = ['Normal', 'Fighting', 'Flying', 'Ground', 'Rock', 'Bug', 'Ghost', 'Poison', 'Steel'];
        const specialTypes = ['Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark'];

        let category = 'Status';
        if (moveData.basePower > 0) {
          if (physicalTypes.includes(moveData.type)) {
            category = 'Physical';
          } else if (specialTypes.includes(moveData.type)) {
            category = 'Special';
          }
        }

        categoryDisplay.textContent = `Category: ${category}`;

        // Assemble the move card
        moveCard.appendChild(moveHeader);
        moveCard.appendChild(moveStats);
        moveCard.appendChild(categoryDisplay);

        // Add click handler if move is not disabled
        if (!move.disabled) {
          moveCard.onclick = () => {
            // Add clicked style
            moveCard.style.backgroundColor = '#4CAF50';
            moveCard.style.color = 'white';
            console.log(`${this.playerName} clicked move ${j + 1}`);
            this.makeMove(i, j + 1);
          };
        }

        movesContainer.appendChild(moveCard);
      });

      pokemonDiv.appendChild(movesContainer);
      moveOptions.appendChild(pokemonDiv);
    });

    // Add to UI
    const controlsDiv = document.getElementById(`${this.playerName.toLowerCase()}-controls`) ||
      createPlayerControlsDiv(this.playerName);
    controlsDiv.innerHTML = '';
    controlsDiv.appendChild(moveOptions);
  }

  makeMove(pokemonIndex: number, moveIndex: number): void {
    this.makeChoice(`move ${moveIndex}`);
  }

  makeChoice(choice: string): void {
    console.log(`${this.playerName} making choice: ${choice}`);
    try {
      void this.stream.write(choice);
    } catch (error) {
      console.error(`${this.playerName} error making choice:`, error);
    }
  }
}

function createPlayerControlsDiv(playerName: string): HTMLElement {
  const controlsDiv = document.createElement('div');
  controlsDiv.id = `${playerName.toLowerCase()}-controls`;
  controlsDiv.className = 'player-controls';
  controlsDiv.style.margin = '10px';
  controlsDiv.style.padding = '10px';
  controlsDiv.style.border = '1px solid #ccc';
  controlsDiv.style.backgroundColor = '#f5f5f5';
  document.body.appendChild(controlsDiv);
  return controlsDiv;
}

// Create manual players instead of RandomPlayerAI with better names
const p1 = new ManualPlayer(streams.p1, true, 'Player1');
const p2 = new ManualPlayer(streams.p2, true, 'Player2');

console.log(p1);
console.log(p2);

const $display = document.getElementById('display')!;
const $tr = document.createElement('tr');
let $log = document.createElement('td');
let $p1 = document.createElement('td');
let $p2 = document.createElement('td');

$tr.appendChild($p1);
$tr.appendChild($log);
$tr.appendChild($p2);
$display.appendChild($tr);

const displayLog = (html: string) => {
  if (!html) return;
  const $div = document.createElement('div');
  $div.innerHTML = html;
  $log.appendChild($div);
};

const displayTeam = ($td: HTMLTableCellElement, side: Side) => {
  const $pdiv = document.createElement('div');
  let $div!: HTMLElement;
  let i = 0;
  for (const pokemon of side.team) {
    if (i % 3 === 0) {
      $div = document.createElement('div');
      $pdiv.appendChild($div);
    }
    const $span = document.createElement('span');
    const icon = Icons.getPokemon(pokemon.speciesForme, {
      side: `p${side.n + 1}` as 'p1' | 'p2',
      gender: pokemon.gender || undefined,
      fainted: pokemon.fainted,
      domain: 'pkmn.cc',
    });
    $span.style.display = icon.css.display;
    $span.style.width = icon.css.width;
    $span.style.height = icon.css.height;
    $span.style.imageRendering = icon.css.imageRendering;
    $span.style.background = icon.css.background;
    $span.style.opacity = icon.css.opacity;
    $span.style.filter = icon.css.filter;

    $div.appendChild($span);
    i++;
  }
  $td.appendChild($pdiv);
};

const displayPokemon = ($td: HTMLTableCellElement, pokemon: Pokemon | null) => {
  const img = addPokemon(pokemon);
  if (img) $td.appendChild(img);
};

const addPokemon = (pokemon: Pokemon | null) => {
  if (pokemon) {
    const sprite = Sprites.getPokemon(pokemon.speciesForme, {
      gen: GRAPHICS,
      gender: pokemon.gender || undefined,
      shiny: pokemon.shiny,
    });
    const $img = document.createElement('img');
    $img.src = sprite.url;
    $img.width = sprite.w;
    $img.height = sprite.h;
    $img.dataset.name = pokemon.name;
    if (pokemon.fainted) {
      $img.style.opacity = '0.3';
      $img.style.filter = 'grayscale(100%) brightness(.5)';
    }
    return $img;
  }
  return undefined;
};

class PreHandler implements Handler<void> {
  constructor(private readonly battle: Battle) {
    this.battle = battle;
  }

  '|faint|'(args: Protocol.Args['|faint|']) {
    const poke = this.battle.getPokemon(args[1]);
    if (poke) {
      const $td = poke.side.n ? $p2 : $p1;
      // eslint-disable-next-line @typescript-eslint/no-for-in-array
      for (const child in $td.children) {
        if (($td.children[child] as HTMLImageElement).dataset.name === poke.name) {
          const old = $td.children[child];
          $td.insertBefore(addPokemon(poke)!, old);
          $td.removeChild(old);
          break;
        }
      }
    }
  }
}

// Add a function to create and update the battle info display
function createBattleInfoDisplay(): HTMLElement {
  const battleInfo = document.createElement('div');
  battleInfo.id = 'battle-info';
  battleInfo.style.position = 'fixed';
  battleInfo.style.top = '10px';
  battleInfo.style.left = '50%';
  battleInfo.style.transform = 'translateX(-50%)';
  battleInfo.style.backgroundColor = '#f5f5f5';
  battleInfo.style.border = '1px solid #ccc';
  battleInfo.style.borderRadius = '5px';
  battleInfo.style.padding = '10px';
  battleInfo.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)';
  battleInfo.style.zIndex = '100';
  battleInfo.style.textAlign = 'center';
  
  const turnDisplay = document.createElement('div');
  turnDisplay.id = 'turn-display';
  turnDisplay.style.fontWeight = 'bold';
  turnDisplay.style.marginBottom = '5px';
  turnDisplay.textContent = 'Turn: 1';
  
  const statusDisplay = document.createElement('div');
  statusDisplay.id = 'status-display';
  statusDisplay.style.fontSize = '0.9em';
  statusDisplay.textContent = 'Battle in progress';
  
  battleInfo.appendChild(turnDisplay);
  battleInfo.appendChild(statusDisplay);
  document.body.appendChild(battleInfo);
  
  return battleInfo;
}

class PostHandler implements Handler<void> {
  constructor(private readonly battle: Battle) {
    this.battle = battle;
  }

  '|teampreview|'() {
    displayTeam($p1, this.battle.p1);
    displayTeam($p2, this.battle.p2);
    
    // Create the battle info display
    createBattleInfoDisplay();
  }

  '|turn|'(args: Protocol.Args['|turn|']) {
    const $tr = document.createElement('tr');

    $p1 = document.createElement('td');
    for (const active of this.battle.p1.active) {
      displayPokemon($p1, active);
    }
    $log = document.createElement('td');
    $p2 = document.createElement('td');
    for (const active of this.battle.p2.active) {
      displayPokemon($p2, active);
    }

    $tr.appendChild($p1);
    $tr.appendChild($log);
    $tr.appendChild($p2);

    $display.appendChild($tr);
    
    // Update the turn display
    const turnNumber = args[1];
    const turnDisplay = document.getElementById('turn-display');
    if (turnDisplay) {
      turnDisplay.textContent = `Turn: ${turnNumber}`;
    }
  }
  
  '|weather|'(args: Protocol.Args['|weather|']) {
    // Update the status display with weather information
    const weather = args[1];
    const statusDisplay = document.getElementById('status-display');
    if (statusDisplay) {
      let weatherText = '';
      switch (weather) {
        case 'RainDance':
          weatherText = 'It\'s raining!';
          break;
        case 'Sandstorm':
          weatherText = 'A sandstorm is raging!';
          break;
        case 'SunnyDay':
          weatherText = 'The sunlight is strong!';
          break;
        case 'Hail':
          weatherText = 'It\'s hailing!';
          break;
        case 'none':
          weatherText = 'The weather cleared up!';
          break;
        default:
          weatherText = `Weather: ${weather}`;
      }
      statusDisplay.textContent = weatherText;
    }
  }
}

const battle = new Battle(gens);
const formatter = new LogFormatter('p1', battle);

const pre = new PreHandler(battle);
const post = new PostHandler(battle);

const add = <T>(h: Handler<T>, k: ArgName | undefined, a: ArgType, kw: BattleArgsKWArgType) => {
  if (k && k in h) (h as any)[k](a, kw);
};

// Add some basic CSS for the battle controls
const style = document.createElement('style');
style.textContent = `
  #battle-controls {
    margin-top: 20px;
    padding: 10px;
    border: 1px solid #ccc;
    background-color: #f5f5f5;
  }
  
  #battle-controls button {
    margin: 5px;
    padding: 8px 12px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  #battle-controls button:hover {
    background-color: #45a049;
  }
`;
document.head.appendChild(style);

void (async () => {
  for await (const chunk of streams.omniscient) {

    // TODO: why does Parcel not like Protocol.parse?
    for (const line of chunk.split('\n')) {
      const { args, kwArgs } = Protocol.parseBattleLine(line);
      const html = formatter.formatHTML(args, kwArgs);
      const key = Protocol.key(args);

      add(pre, key, args, kwArgs);
      battle.add(args, kwArgs);
      add(post, key, args, kwArgs);

      displayLog(html);
    }
    battle.update();
  }
})();

// Start the battle
void streams.omniscient.write(`>start ${JSON.stringify(spec)}
>player p1 ${JSON.stringify(p1spec)}
>player p2 ${JSON.stringify(p2spec)}`);

// Don't call p1.start() and p2.start() to prevent automatic simulation
// Instead, we'll manually handle the requests through our ManualPlayer class

// Add helper functions to make moves from the console for debugging
(window as any).makeP1Move = (moveIndex: number) => {
  p1.makeChoice(`move ${moveIndex}`);
};

(window as any).makeP2Move = (moveIndex: number) => {
  p2.makeChoice(`move ${moveIndex}`);
};