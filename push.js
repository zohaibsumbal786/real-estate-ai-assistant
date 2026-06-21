const { execSync } = require('child_process');
const path = require('path');

const projectDir = 'c:\\Users\\zohai\\OneDrive\\Desktop\\ai prtoject promt\\real estate ai assitant';

try {
  console.log('Changing to project directory...');
  process.chdir(projectDir);
  
  console.log('Configuring git remote...');
  execSync('git remote set-url origin https://github.com/zyftora-code/Real-Estate-Ai-Assitant.git', { stdio: 'inherit' });
  
  console.log('\nPushing to GitHub...');
  execSync('git push -u origin main --force', { stdio: 'inherit', timeout: 120000 });
  
  console.log('\n✅ Push completed successfully!');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
