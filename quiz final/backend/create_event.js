const http = require('http');

const questions = [
  // Easy
  { q: "How many sides does a triangle have?", a: "3", diff: "easy" },
  { q: "How many angles does a hexagon have?", a: "6", diff: "easy" },
  { q: "The smallest two digit number.", a: "10", diff: "easy" },
  { q: "The greatest three digit number?", a: "999", diff: "easy" },
  { q: "What is the difference between 23 and 16?", a: "7", diff: "easy" },
  { q: "Which is the highest mountain peak in the World?", a: "Mt. Everest", diff: "easy" },
  { q: "Which is the pointing input device?", a: "Mouse", diff: "easy" },
  { q: "What is full form of PT?", a: "Physical Training", diff: "easy" },
  { q: "What is the plural form of the word 'Child'?", a: "Children", diff: "easy" },
  { q: "How many teeth does a matured human have?", a: "32", diff: "easy" },
  { q: "What is the past form of do?", a: "did", diff: "easy" },
  { q: "How many letters are there in English alphabets?", a: "26", diff: "easy" },
  { q: "Where was Gautam Buddha born?", a: "Lumbini", diff: "easy" },
  { q: "Which is the longest river in the world?", a: "Nile", diff: "easy" },

  // Medium
  { q: "What is the place value of 8 in 68,25,362?", a: "lakh", diff: "medium" },
  { q: "How many lakhs are there in one million?", a: "10 lakhs", diff: "medium" },
  { q: "Which is the landlocked country in south Asia ?", a: "Nepal", diff: "medium" },
  { q: "Which ones are the neighbouring countries of Nepal?", a: "India & China", diff: "medium" },
  { q: "How many consonants letters are there in English alphabets ?", a: "21", diff: "medium" },
  { q: "Which is the hottest region in Nepal?", a: "Terai", diff: "medium" },
  { q: "Which computer is used in Scientific research?", a: "Super Computer", diff: "medium" },
  { q: "Who invented the light bulb?", a: "Thomas Alva Edison", diff: "medium" },
  { q: "How many MB is equal to 1 GB?", a: "1024 MB", diff: "medium" },
  { q: "What is the first step in Scientific learning process?", a: "Observation", diff: "medium" },
  { q: "How many types of disease are there?", a: "2", diff: "medium" },
  { q: "Who is this with image link https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Portrait_of_Sir_Isaac_Newton%2C_1689_%28brightened%29.jpg/1280px-Portrait_of_Sir_Isaac_Newton%2C_1689_%28brightened%29.jpg", a: "Sir Isaac Newton", diff: "medium" },
  { q: "How many classes are there in nutrients?", a: "6", diff: "medium" },
  { q: "Which food helps to developed our body?", a: "Protein", diff: "medium" },
  { q: "Who discovered Steam engine?", a: "James Watt", diff: "medium" },
  { q: "What is the comparative degree of heavy?", a: "Heavier", diff: "medium" },
  { q: "कन्दमूल शब्दको अर्थ के हो ? (What is the meaning of the word 'Kandamil'?)", a: "जमिनमुनी फल्ने फल (Fruit that grows underground)", diff: "medium" },
  { q: "आकाश शब्दको उल्टो अर्थ बुझाउने शब्द भन्नुहोस् ? (What is the opposite of the word 'Aakash'?)", a: "पाताल (Paatal)", diff: "medium" },
  { q: "सुचिकारको काम के हो ? (What is the job of a tailor?)", a: "लुगा सिलाउने (Sewing clothes)", diff: "medium" },

  // Hard
  { q: "राष्ट्रिय गानमा कति हरफ रहेका छन् ? (How many lines are there in the national anthem?)", a: "८ हरफ (8 lines)", diff: "hard" },
  { q: "राष्ट्रकवि भनेर माधब प्रसाद घिमिरेलाई चिनिन्छ भने महाकवि भनेर कुन कविलाई चिनिन्छ ? (If Madhav Prasad Ghimire is known as Rashtrakavi, which poet is known as Mahakavi?)", a: "लक्ष्मीप्रसाद देवकोटा (Laxmi Prasad Devkota)", diff: "hard" },
  { q: "नेपालको राष्ट्रिय गानका संगीतकार को हुन् ? (Who is the musical composer of Nepal's national anthem?)", a: "अम्बर गुरुङ (Amber Gurung)", diff: "hard" },
  { q: "लुम्बिनी प्रदेशमा कति वटा जिल्ला रहेका छन् ? (How many districts are there in Lumbini Province?)", a: "१२ (12)", diff: "hard" },
  { q: "अहिलेको शिक्षामन्त्रीको नाम के हो ? (What is the name of the current Education Minister?)", a: "सुमित पोखरेल (Sumit Pokharel)", diff: "hard" },
  { q: "सैनामैना नगरपालिकामा कति वटा वडा रहेका छन् ? (How many wards are there in Sainamaina Municipality?)", a: "११ वटा (11 wards)", diff: "hard" },
  { q: "सैनामैना नगरपालिकाको क्षेत्रफल कति रहेको छ ? (What is the total area of Sainamaina Municipality?)", a: "१६२.१८ कि.मि (162.18 km)", diff: "hard" }
];

function request(path, method, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api' + path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      }
    };
    if (token) options.headers['Authorization'] = 'Bearer ' + token;

    const req = http.request(options, res => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(resBody));
        } else {
          reject(new Error(`Status ${res.statusCode}: ${resBody}`));
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  try {
    console.log('Logging in...');
    const loginRes = await request('/auth/login', 'POST', { username: 'admin', password: 'admin123' });
    const token = loginRes.token;

    console.log('Creating event...');
    // Today's date in YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    const eventRes = await request('/events', 'POST', {
      name: 'General Knowledge Quiz',
      description: 'Quiz based on provided questions',
      date: today
    }, token);
    const eventId = eventRes.id;
    console.log(`Event created with ID: ${eventId}`);

    console.log('Adding questions...');
    for (const q of questions) {
      await request(`/questions/${eventId}`, 'POST', {
        question: q.q,
        answer: q.a,
        difficulty: q.diff
      }, token);
      process.stdout.write('.');
    }
    console.log('\nAll questions added successfully!');
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
