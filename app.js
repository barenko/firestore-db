const admin = require('firebase-admin')
const parser = require('really-relaxed-json').createParser()
const yargs = require('yargs')

const argv = yargs
        .option('verbose', {
            alias: 'v',
            describe: 'Verbose log'
        })
        .option('json', {
            alias: 'j',
            describe: 'Use strict json format instead of relaxed-json'
        })
        .option('environment', {
            alias: 'e',
            describe: 'GOOGLE_APPLICATION_CREDENTIALS to environment',
            choices: ['qa', 'ti', 'prod']
          })
        .option('collection', {
            alias: 'c',
            describe: 'Collection name'
          })
        .demandOption(['collection'])
        .command('get <id>', 'get a document by ID', (yargs) => {
            yargs.positional('id', {
                describe: 'The document id',
                type: 'string'
            })
        })
        .command('update-field <id> <field> <content>', 'update a document field', (yargs) => {
            yargs.positional('id', {
                describe: 'The document id',
                type: 'string'
            }).positional('field', {
                describe: 'The document field to be updated',
                type: 'string'
            }).positional('content', {
                describe: 'The new content (will be parsed to json)'
            }).positional('yes', {
                alias: 's',
                describe: 'Confirm update (otherwise only show how the data will be after the change - without apply)'
            })
        })
        .demandCommand(1, 1, 'You need to specify a command before moving on', 'You can only specify one command a time')
        .help('help')
        .argv

if(argv._[0] === 'get'){
    let db = initDb()
    get(argv.id, (err, res) => {
        if(err) return console.log(err)
        console.dir(res, {depth:null, colors:true})
    })
} else if(argv._[0] === 'update-field'){
    let db = initDb()
    updateField(argv.id, argv.field, argv.content, argv.yes, (err, res) => {
        if(err) return console.log(err)
        console.dir(res, {depth:null, colors:true})
    })
}

function initDb(){
    let GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS
    if(!process.env.GOOGLE_APPLICATION_CREDENTIALS){
        console.log("You need to set the GOOGLE_APPLICATION_CREDENTIALS!")
        process.exit(1)
    }

    if(argv.verbose) console.log(`Initializing firestore connection using ${GOOGLE_APPLICATION_CREDENTIALS}...`)
    admin.initializeApp({
        credential: admin.credential.cert(require(GOOGLE_APPLICATION_CREDENTIALS))
    })

    db = admin.firestore()
    if(argv.verbose) console.log(`Firestore connected.`)
    return db;
}

function get(id, cb){
    let docRef = db.collection(argv.collection).doc(id)
    if(argv.verbose) console.log(`Getting ${id} document on ${argv.collection}...`)
    docRef.get().then(d=> {
        if(!d.exists) return cb("Document not exists")
        cb(null, d.data())
    })
    .catch(cb)
}

function updateField(id, field, content, change, cb){
    let docRef = db.collection(argv.collection).doc(id)
    if(argv.verbose) console.log(`Updating ${id} document on ${argv.collection}: field ${field} to ${content}...`)
    if(change){
        docRef.update({
            [field]: JSON.parse(argv.json ? content : parser.stringToJson(content))
        }).then(() => get(id, cb))   
        .catch(cb)
    } else {
        console.log("NOTICE: The data only will be changed if the flag '--yes' was setted")
        docRef.get().then(d=> {
            let data = d.data()
            data[field] = JSON.parse(argv.json ? content : parser.stringToJson(content))
            cb(null, data)
        })    
        .catch(cb)
    }
}