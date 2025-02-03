import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MLService {
    async getRecommendations(userSkills) {
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(__dirname, 'scripts', 'predict.py');
            
            console.log('ML Service - Input Skills:', userSkills);
            console.log('Python Script Path:', scriptPath);
            
            const pythonProcess = spawn('python', [
                scriptPath,
                JSON.stringify(userSkills)
            ]);

            let result = '';
            let error = '';

            pythonProcess.stdout.on('data', (data) => {
                result += data.toString();
                console.log('Python Output:', data.toString());
            });

            pythonProcess.stderr.on('data', (data) => {
                error += data.toString();
                console.error('Python Error:', data.toString());
            });

            pythonProcess.on('close', (code) => {
                console.log('Python Process Exit Code:', code);
                if (code !== 0) {
                    reject(new Error(`Python process failed: ${error}`));
                    return;
                }
                try {
                    const predictions = JSON.parse(result);
                    console.log('Parsed Predictions:', predictions);
                    resolve(predictions);
                } catch (err) {
                    reject(new Error(`Failed to parse predictions: ${err.message}`));
                }
            });
        });
    }
}

export default new MLService(); 