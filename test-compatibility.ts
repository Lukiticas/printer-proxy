console.log('Node version:', process.version);

try {
    const printer = require('@grandchef/node-printer');
    console.log('✅ @grandchef/node-printer loaded successfully');
    
    printer.getPrinters((err, printers) => {
        if (err) {
            console.log('❌ Error getting printers:', err);
        } else {
            console.log('✅ Printers found:', printers.length);
            printers.forEach(p => console.log(`  - ${p.name}`));
        }
    });
} catch (error) {
    console.log('❌ Failed to load printer library:', error.message);
}