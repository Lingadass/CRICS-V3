import type { EN_TRANSLATIONS } from './en';

// TODO: human review — Machine-translated Hindi dictionary for CRICS Cricket Scorer
export const HI_TRANSLATIONS: typeof EN_TRANSLATIONS = {
  appName: 'CRICS Cricket Scorer',
  tagline: '100% ऑफ़लाइन क्रिकेट स्कोरिंग, करियर आंकड़े और टूर्नामेंट प्रबंधक', // TODO: human review
  nav: {
    home: 'डैशबोर्ड', homeShort: 'होम', live: 'लाइव स्कोरर', scorecards: 'स्कोरकार्ड', matches: 'मैच', players: 'खिलाड़ी', // TODO: human review
    teams: 'टीमें', careers: 'करियर', stats: 'आंकड़े', tournaments: 'टूर्नामेंट', leaderboards: 'लीडरबोर्ड', // TODO: human review
    settings: 'बैकअप और सेटिंग्स', newMatch: 'नया मैच', scan: 'पास स्कैन', more: 'अधिक', skipToContent: 'मुख्य सामग्री पर जाएं', // TODO: human review
    loadingApp: 'आपके ऑफ़लाइन क्रिकेट रिकॉर्ड लोड हो रहे हैं...', offlineBadge: 'ऑफ़लाइन', // TODO: human review
    desktopNavAria: 'डेस्कटॉप मुख्य नेविगेशन', mobileNavAria: 'मोबाइल निचला नेविगेशन', // TODO: human review
    leaveLiveTitle: 'लाइव मैच स्कोरिंग छोड़ें?', // TODO: human review
    leaveLiveDesc: 'प्रत्येक गेंद आपके फ़ोन पर सहेजी गई है और आप कभी भी जारी रख सकते हैं, लेकिन बाहर निकलने से लाइव कीपैड बंद हो जाएगा।', // TODO: human review
    stayOnLiveBtn: 'लाइव मैच पर रहें', leaveLiveBtn: 'मैच दृश्य छोड़ें', // TODO: human review
    errorEncountered: 'में एक त्रुटि हुई', errorDefaultScope: 'एप्लिकेशन', // TODO: human review
    errorSafeNotice: 'आपके मैच और खिलाड़ी इस फ़ोन पर सुरक्षित हैं। आप नीचे फिर से प्रयास कर सकते हैं या आपातकालीन बैकअप सहेज सकते हैं।', // TODO: human review
    retryViewBtn: 'पुनः प्रयास करें', emergencyBackupBtn: 'आपातकालीन बैकअप फ़ाइल', // TODO: human review
  },
  scoring: {
    striker: 'स्ट्राइकर', nonStriker: 'नॉन-स्ट्राइकर', bowler: 'गेंदबाज', swapStrike: 'स्ट्राइक बदलें', // TODO: human review
    changeBowler: 'गेंदबाज बदलें', retireReplace: 'रिटायर / सब', undo: 'पूर्ववत', redo: 'फिर से', // TODO: human review
    editBall: 'गेंद संपादित करें', wicket: 'विकेट', wide: 'वाइड', noBall: 'नो बॉल', bye: 'बाई', // TODO: human review
    legBye: 'लेग बाई', penalty: 'पेनल्टी', freeHitActive: 'फ्री हिट गेंद', // TODO: human review
    inningsBreak: 'पारी ब्रेक', startSecondInnings: 'दूसरी पारी शुरू करें', // TODO: human review
    startSuperOver: 'सुपर ओवर शुरू करें', revisedTarget: 'संशोधित लक्ष्य', target: 'लक्ष्य', // TODO: human review
    crr: 'CRR', rrr: 'RRR', thisOver: 'इस ओवर में', partnership: 'साझेदारी', // TODO: human review
    lastWicket: 'अंतिम विकेट', endInnings: 'पारी समाप्त करें', moreRuns: 'अधिक', highContrastBtn: 'हाई कॉन्ट्रास्ट', // TODO: human review
    nbBat: 'नो बॉल + बल्ले', nbByes: 'नो बॉल + बाई', nbLegByes: 'नो बॉल + लेग बाई', moreActions: 'अधिक विकल्प', // TODO: human review
    backBtn: 'वापस', menuBtn: 'मेनू', swapShort: 'स्ट्राइक बदलें', bowlerShort: 'गेंदबाज', // TODO: human review
    retireShort: 'रिटायर', editShort: 'संपादित', // TODO: human review
    noActiveMatch: 'कोई सक्रिय मैच नहीं मिला। स्कोरिंग शुरू करने के लिए नया मैच शुरू करें।', // TODO: human review
    startNewMatchBtn: 'नया मैच शुरू करें', dismissBtn: 'बंद करें', runOutOnly: 'केवल रन आउट', freeHitBadge: 'फ्री हिट', // TODO: human review
    liveScoreboardAria: 'लाइव स्कोरबोर्ड', vsShort: 'बनाम', needRuns: 'चाहिए', inBalls: 'में', ballsSuffix: 'गेंद', // TODO: human review
    switchMatchAria: 'मैच बदलें', lockKeypadTitle: 'स्कोरिंग कीपैड लॉक या अनलॉक करें', // TODO: human review
    lockedBtn: 'लॉक है', lockBtn: 'लॉक', dlsShort: 'DLS', // TODO: human review
    highContrastAria: 'धूप के लिए हाई कॉन्ट्रास्ट मोड बदलें', pshipShort: 'साझेदारी', zeroBalls: '0 गेंद', // TODO: human review
    endOfOver: 'ओवर समाप्त', nextBowlerPrompt: 'अगला गेंदबाज', selectBowlerBtn: 'गेंदबाज चुनें', // TODO: human review
    oversHistoryAria: 'ओवर और गेंदों का इतिहास', overAbbr: 'ओवर', // TODO: human review
    keypadAria: 'गेंद-दर-गेंद स्कोरिंग कीपैड', extraChooserAria: 'अतिरिक्त रन चयन', // TODO: human review
    tapRunsToRecord: 'रिकॉर्ड करने के लिए रन टैप करें', cancelExtraAria: 'अतिरिक्त चयन रद्द करें', // TODO: human review
    overthrowsChooserAria: 'ओवरथ्रो / अधिक रन चयन', overthrowsTitle: 'ओवरथ्रो / अधिक रन', // TODO: human review
    runsUpper: 'रन', dotUpper: 'डॉट', fourUpper: 'चौका', sixUpper: 'छक्का', wktShort: 'विकेट', // TODO: human review
    recordWicketTitle: 'विकेट दर्ज करें', freeHitDeliverySuffix: '(फ्री हिट गेंद)', // TODO: human review
    dismissalTypeLabel: 'आउट होने का प्रकार', dismissedBatterLabel: 'आउट होने वाला बल्लेबाज', // TODO: human review
    incomingBatterLabel: 'नया बल्लेबाज', noneAllOut: 'कोई नहीं (ऑल आउट)', // TODO: human review
    fielderKeeperLabel: 'फील्डर / विकेटकीपर', completedRunsLabel: 'पूरे किए गए रन', // TODO: human review
    newBatterEndLabel: 'नए बल्लेबाज का छोर', strikerEnd: 'स्ट्राइकर छोर', nonStrikerEnd: 'नॉन-स्ट्राइकर छोर', // TODO: human review
    confirmWicketBtn: 'विकेट की पुष्टि करें (WKT)', changeReasonLabel: 'बदलाव का कारण', // TODO: human review
    reasonEndOfOver: 'ओवर की समाप्ति', reasonInjury: 'ओवर के बीच चोट प्रतिस्थापन', reasonSuspension: 'गेंदबाज निलंबन', // TODO: human review
    selectEligibleBowlerLabel: 'योग्य गेंदबाज चुनें', maxOversPrefix: 'अधिकतम', oversWord: 'ओवर', oversShort: 'ओवर', // TODO: human review
    maidensWord: 'मेडन', runsWord: 'रन', wicketsWord: 'विकेट', // TODO: human review
    invalidDeliveryError: 'अमान्य गेंद।', invalidWicketError: 'अमान्य विकेट गेंद।', ineligibleBowlerError: 'अयोग्य गेंदबाज चुना गया।', // TODO: human review
    ineligibleSuffix: 'अयोग्य', setBowlerBtn: 'गेंदबाज चुनें', // TODO: human review
    retireModalTitle: 'बल्लेबाज रिटायर या बदलें', batterLeavingLabel: 'क्रीज छोड़ने वाला बल्लेबाज', // TODO: human review
    replacementBatterLabel: 'नया बल्लेबाज', // TODO: human review
    retiredHurtCheckbox: 'रिटायर्ड हर्ट (नॉट आउट — बाद में बल्लेबाजी के लिए आ सकता है)', confirmBtn: 'पुष्टि करें', // TODO: human review
    wktBowled: 'बोल्ड', wktCaught: 'कैच', wktLbw: 'एलबीडब्ल्यू (LBW)', wktRunOut: 'रन आउट', wktStumped: 'स्टंप', // TODO: human review
    wktHitWicket: 'हिट विकेट', wktRetiredHurt: 'रिटायर्ड हर्ट (वापस आ सकता है)', wktRetiredOut: 'रिटायर्ड आउट', // TODO: human review
    wktObstructing: 'फील्ड में बाधा', wktHitTwice: 'गेंद को दो बार मारना', wktTimedOut: 'टाइम्ड आउट', // TODO: human review
    editBallModalTitle: 'पिछली गेंद संपादित करें', // TODO: human review
    selectDeliveryPrompt: 'रन, अतिरिक्त या विकेट बदलने के लिए किसी भी रिकॉर्ड की गई गेंद को चुनें:', // TODO: human review
    seqPrefix: 'क्रम #', innShort: 'पारी', editingSeqPrefix: 'गेंद क्रम संपादित करें #', inningsWord: 'पारी', // TODO: human review
    runsOffBatLabel: 'बल्ले से रन', extraTypeLabel: 'अतिरिक्त प्रकार', extraNone: 'कोई नहीं', // TODO: human review
    nbSecondaryLabel: 'नो-बॉल उप-प्रकार (बल्ले बनाम बाई/लेग-बाई)', // TODO: human review
    nbOffBatOption: 'बल्ले से (सामान्य नो-बॉल)', nbByesOption: 'नो-बॉल + बाई', nbLegByesOption: 'नो-बॉल + लेग-बाई', // TODO: human review
    extraRunsLabel: 'अतिरिक्त रन', wicketOnBallCheckbox: 'इस गेंद पर विकेट', // TODO: human review
    backToBallListBtn: 'गेंद सूची पर वापस जाएं', recalculateMatchBtn: 'मैच की पुनः गणना करें', // TODO: human review
    revisedTargetModalTitle: 'संशोधित लक्ष्य निर्धारित करें', // TODO: human review
    revisedTargetRunsLabel: 'संशोधित लक्ष्य रन', revisedMaxOversLabel: 'संशोधित अधिकतम ओवर', applyTargetBtn: 'लक्ष्य लागू करें', // TODO: human review
    matchCompletedTitle: 'मैच समाप्त', setupSecondInningsPrefix: 'दूसरी पारी सेटअप', chaseLabel: 'पीछा', // TODO: human review
    openingStrikerLabel: 'ओपनिंग स्ट्राइकर', openingNonStrikerLabel: 'ओपनिंग नॉन-स्ट्राइकर', openingBowlerLabel: 'ओपनिंग गेंदबाज', // TODO: human review
    superOverTieBreaker: '1 ओवर टाई-ब्रेकर', startSuperOverChasePrefix: 'सुपर ओवर लक्ष्य शुरू करें', // TODO: human review
    undoLastBallBtn: 'अंतिम गेंद पूर्ववत करें', finalizeMatchBtn: 'मैच परिणाम अंतिम करें', // TODO: human review
    keypadLockedTitle: 'स्कोरिंग कीपैड लॉक है (पॉकेट सुरक्षा)', accidentalTapsBlocked: 'गलती से टैप बंद हैं', // TODO: human review
    keepHoldingUnlock: 'अनलॉक करने के लिए दबाए रखें', pressHoldUnlock: 'कीपैड अनलॉक करने के लिए दबाए रखें (1.5 सेकंड)', // TODO: human review
    enterScorerPinPlaceholder: 'या स्कोरर पिन दर्ज करें', scorerPinAria: 'स्कोरर पिन', // TODO: human review
    unlockViaPinBtn: 'पिन से अनलॉक करें', incorrectPinError: 'गलत स्कोरर पिन।', // TODO: human review
    chaseNeedOneRunOneBall: '{team} को 1 गेंद में 1 रन चाहिए', // TODO: human review
    chaseNeedOneRunManyBalls: '{team} को {balls} गेंदों में 1 रन चाहिए', // TODO: human review
    chaseNeedManyRunsOneBall: '{team} को 1 गेंद में {runs} रन चाहिए', // TODO: human review
    chaseNeedManyRunsManyBalls: '{team} को {balls} गेंदों में {runs} रन चाहिए', // TODO: human review
    chaseStripOneRunOneBall: '1 गेंद में 1 रन चाहिए', // TODO: human review
    chaseStripOneRunManyBalls: '{balls} गेंदों में 1 रन चाहिए', // TODO: human review
    chaseStripManyRunsOneBall: '1 गेंद में {runs} रन चाहिए', // TODO: human review
    chaseStripManyRunsManyBalls: '{balls} गेंदों में {runs} रन चाहिए', // TODO: human review
    wonByOneRun: '{team} 1 रन से जीता', // TODO: human review
    wonByManyRuns: '{team} {runs} रनों से जीता', // TODO: human review
    wonByOneWicket: '{team} 1 विकेट से जीता', // TODO: human review
    wonByManyWickets: '{team} {wickets} विकेटों से जीता', // TODO: human review
    resultWonSuperOver: '{team} सुपर ओवर में जीता', // TODO: human review
    resultSuperOverTied: 'सुपर ओवर टाई', // TODO: human review
    resultMatchTied: 'मैच टाई — सुपर ओवर उपलब्ध', // TODO: human review
    resultNoResult: 'मैच रद्द — बेनतीजा', // TODO: human review
    resultInningsBreakTarget: 'पारी ब्रेक — लक्ष्य {target}', // TODO: human review
    resultInProgress: 'मैच जारी है', // TODO: human review
    last12Balls: 'पिछली 12 गेंदें', // TODO: human review
    noBallsYet: 'अभी कोई गेंद नहीं', // TODO: human review
    lastWicketNone: 'कोई नहीं', // TODO: human review
    confirmBowlerChanged: 'गेंदबाज बदला गया', // TODO: human review
    confirmStrikeSwapped: 'स्ट्राइक बदली गई', // TODO: human review
    confirmBatterRetired: 'बल्लेबाज रिटायर हुए', // TODO: human review
    confirmWicketRecorded: 'विकेट दर्ज हुआ', // TODO: human review
    confirmDotRecorded: 'डॉट गेंद दर्ज हुई', // TODO: human review
    confirmRunSingular: 'रन', // TODO: human review
    confirmRunsPlural: 'रन', // TODO: human review
    confirmRecordedSuffix: 'दर्ज', // TODO: human review
  },
  common: {
    save: 'सहेजें', cancel: 'रद्द करें', delete: 'हटाएं', edit: 'संपादित करें', close: 'बंद करें', // TODO: human review
    exportPdf: 'PDF निर्यात', exportPng: 'इमेज निर्यात', share: 'शेयर करें', offlineReady: '100% ऑफ़लाइन तैयार', // TODO: human review
    backupReminder: 'बैकअप अनुशंसा: कृपया अपना डेटा बैकअप फ़ाइल में सहेजें।', installApp: 'ऐप इंस्टॉल करें', // TODO: human review
    updateNow: 'अभी अपडेट करें', loadingModule: 'लोड हो रहा है...', undoAction: 'पूर्ववत करें', // TODO: human review
  },
  dashboard: {
    liveInProgress: 'लाइव मैच जारी है', continueMatch: 'मैच जारी रखें', // TODO: human review
    readyHeading: 'अगला मैच स्कोर करने के लिए तैयार', // TODO: human review
    readySubtitle: 'प्रत्येक गेंद आपके डिवाइस पर सुरक्षित रूप से सहेजी जाती है। 1 टैप में स्कोर करें और ऑफ़लाइन करियर ट्रैक करें।', // TODO: human review
    quickCommandCenter: 'त्वरित कार्य', resumeScoring: 'मैच जारी रखें', viewLiveScorecard: 'लाइव स्कोरकार्ड देखें', // TODO: human review
    recentMatches: 'हाल के मैच', allScorecards: 'सभी स्कोरकार्ड', registeredPlayers: 'पंजीकृत खिलाड़ी', // TODO: human review
    activeSquads: 'सक्रिय टीमें', matchesRecorded: 'रिकॉर्ड किए गए मैच', ballEventsCount: 'कुल गेंदें', // TODO: human review
    lastBackupStatus: 'पिछला बैकअप', backupNever: 'कभी नहीं सहेजा गया', backupToday: 'आज', backupDaysAgo: 'दिन पहले', // TODO: human review
    firstRunTitle: 'शुरुआती कदम', stepAddPlayers: '1. खिलाड़ी जोड़ें', stepCreateTeam: '2. टीम बनाएं', stepStartMatch: '3. मैच शुरू करें', // TODO: human review
    backupReminderAria: 'बैकअप अनुस्मारक', backupNowBtn: 'अभी बैकअप लें', // TODO: human review
    idCardsAndCsv: 'आईडी कार्ड और CSV', backupAndRestore: 'बैकअप और रिस्टोर', // TODO: human review
    installBannerText: 'तुरंत ऑफ़लाइन एक्सेस के लिए अपनी होम स्क्रीन पर CRICS इंस्टॉल करें', installOnIosBtn: 'iOS पर इंस्टॉल करें', // TODO: human review
    noMatchesYet: 'अभी तक कोई मैच रिकॉर्ड नहीं किया गया है। अपनी टीमें सेट करें और पहला मैच शुरू करें।', // TODO: human review
    scoreLiveBtn: 'लाइव स्कोर करें', scorecardBtn: 'स्कोरकार्ड', deleteMatchAria: 'मैच हटाएं', // TODO: human review
    tournamentsAndCareerHub: 'टूर्नामेंट और करियर हब', manageBtn: 'प्रबंधित करें', // TODO: human review
    scheduledFixtures: 'निर्धारित मैच', officialNrrTable: 'आधिकारिक NRR तालिका', // TODO: human review
    careerProfilesHeading: 'खिलाड़ी करियर प्रोफ़ाइल और हेड-टू-हेड', // TODO: human review
    careerProfilesSub: 'जीवनकाल के आंकड़े, फॉर्म ग्राफ और बल्लेबाज बनाम गेंदबाज मुकाबले', // TODO: human review
    welcomeAria: 'CRICS में आपका स्वागत है', welcomeHeading: '3 आसान चरणों में अपना क्लब सेट करें', // TODO: human review
    loadSampleDataBtn: 'सैंपल डेटा लोड करें', deleteMatchTitle: 'मैच स्थायी रूप से हटाएं?', // TODO: human review
    deleteMatchPrefix: 'आप स्थायी रूप से हटाने जा रहे हैं', atWord: 'स्थान:', alongWithWord: 'के साथ', // TODO: human review
    recordedBallsSuffix: 'रिकॉर्ड की गई गेंदें', deleteMatchNotice: 'करियर आंकड़े और टूर्नामेंट तालिका तुरंत अपडेट हो जाएगी।', // TODO: human review
    deleteMatchConfirmBtn: 'मैच और गेंदें हटाएं', iosGuideTitle: 'iPhone / iPad पर CRICS इंस्टॉल करें', // TODO: human review
    iosGuideStep1: '1. Safari टूलबार में Share बटन पर टैप करें।', iosGuideStep2: '2. नीचे स्क्रॉल करें और Add to Home Screen पर टैप करें।', // TODO: human review
  },
  wizard: {
    title: 'मैच सेटअप विज़ार्ड', subtitle: 'टीमें, प्लेइंग XI, टॉस, पावरप्ले और नियम कॉन्फ़िगर करें।', // TODO: human review
    startMatchBtn: 'लाइव मैच शुरू करें', metadataSection: '01. मैच विवरण और मैदान', // TODO: human review
    rulesSection: '02. ओवर, पावरप्ले और अतिरिक्त नियम', tossWonBy: 'टॉस विजेता', tossDecision: 'टॉस निर्णय', // TODO: human review
    step1Title: 'चरण 1: मैच विवरण और नियम', step2Title: 'चरण 2: टीमें और प्लेइंग XI', step3Title: 'चरण 3: टॉस और ओपनर', // TODO: human review
    stepReady: 'तैयार', stepCheck: 'जांचें', matchTitleLabel: 'मैच का नाम', formatLabel: 'प्रारूप (Format)', // TODO: human review
    formatT20Option: 'T20 (20 ओवर)', formatT10Option: 'T10 (10 ओवर)', formatOdiOption: 'वनडे (50 ओवर)', formatCustomOption: 'कस्टम ओवर', // TODO: human review
    tournamentOptionalLabel: 'टूर्नामेंट (वैकल्पिक)', friendlyStandaloneOption: 'मैत्रीपूर्ण / स्वतंत्र मैच', // TODO: human review
    linkFixtureLabel: 'निर्धारित टूर्नामेंट मैच से जोड़ें', adhocFixtureOption: 'अलग टूर्नामेंट मैच (कोई फिक्स्चर लिंक नहीं)', // TODO: human review
    venueLabel: 'मैदान / स्थान', dateLabel: 'तारीख', seasonLabel: 'सीज़न', scorerNameLabel: 'स्कोरर का नाम', // TODO: human review
    oversPerInningsLabel: 'प्रति पारी ओवर', powerplayOversLabel: 'पावरप्ले ओवर', maxOversPerBowlerLabel: 'अधिकतम ओवर / गेंदबाज', // TODO: human review
    widePenaltyLabel: 'वाइड अतिरिक्त रन', noBallPenaltyLabel: 'नो-बॉल अतिरिक्त रन', freeHitOnNoBallLabel: 'नो-बॉल पर फ्री हिट', // TODO: human review
    electToBat: 'बल्लेबाजी चुनी', electToBowl: 'गेंदबाजी चुनी', teamALabel: 'टीम A', teamBLabel: 'टीम B', // TODO: human review
    playingXiLabel: 'प्लेइंग XI', selectTeamAria: 'चुनें', chooseAtLeast2Players: 'कृपया कम से कम 2 खिलाड़ी चुनें:', // TODO: human review
    inOpposingXiSuffix: 'विरोधी XI में शामिल', // TODO: human review
    sameTeamError: 'टीम A और टीम B एक ही नहीं हो सकतीं। कृपया दो अलग-अलग टीमें चुनें।', // TODO: human review
    openersSectionTitle: '03. ओपनिंग स्ट्राइकर, नॉन-स्ट्राइकर और ओपनिंग गेंदबाज', // TODO: human review
    differentOpenersError: 'कृपया दो अलग-अलग ओपनिंग बल्लेबाज चुनें।', // TODO: human review
    openingStrikerLabel: 'ओपनिंग स्ट्राइकर', openingNonStrikerLabel: 'ओपनिंग नॉन-स्ट्राइकर', openingBowlerLabel: 'ओपनिंग गेंदबाज', // TODO: human review
    defaultMatchTitle: 'क्लब चैंपियनशिप मुकाबला', defaultVenueName: 'मुख्य ओवल मैदान', defaultScorerName: 'आधिकारिक स्कोरर', // TODO: human review
    checkDetailsError: 'कृपया शुरू करने से पहले ऊपर मैच विवरण जांचें।', // TODO: human review
  },
  scorecards: {
    title: 'पूर्ण मैच स्कोरकार्ड', subtitle: 'बल्लेबाजी, गेंदबाजी, विकेट पतन, साझेदारियां और चार्ट।', // TODO: human review
    battingCard: 'बल्लेबाजी कार्ड', bowlingCard: 'गेंदबाजी कार्ड', fallOfWickets: 'विकेट पतन', partnerships: 'साझेदारियां', // TODO: human review
    manhattanChart: 'मैनहट्टन चार्ट', wormChart: 'वर्म चार्ट', overLog: 'ओवर-दर-ओवर लॉग', potmLabel: 'प्लेयर ऑफ द मैच', // TODO: human review
    emptyMessage: 'अभी कोई मैच स्कोरकार्ड उपलब्ध नहीं है। स्कोरकार्ड रिकॉर्ड करने के लिए एक मैच शुरू करें।', // TODO: human review
    selectMatchAria: 'मैच स्कोरकार्ड चुनें', scorerLabel: 'स्कोरर', // TODO: human review
    potmManualSuffix: '(मैनुअल)', potmAutoImpactSuffix: '(ऑटो इम्पैक्ट)', potmAutoSuffix: '(ऑटो)', potmAutoCalculated: 'स्वतः गणना', // TODO: human review
    superOverLabel: 'सुपर ओवर', inningsLabel: 'पारी', battingSuffix: 'बल्लेबाजी', bowlingSuffix: 'गेंदबाजी', // TODO: human review
    batterCol: 'बल्लेबाज', statusCol: 'स्थिति', runsCol: 'रन', ballsCol: 'गेंद', foursCol: '4s', sixesCol: '6s', srCol: 'SR', // TODO: human review
    extrasLabel: 'अतिरिक्त', totalLabel: 'कुल स्कोर', oversLabel: 'ओवर', didNotBatLabel: 'बल्लेबाजी नहीं की:', // TODO: human review
    bowlerCol: 'गेंदबाज', oversCol: 'O', maidensCol: 'M', wicketsCol: 'W', econCol: 'ECON', // TODO: human review
    noWicketsFell: 'इस पारी में कोई विकेट नहीं गिरा।', // TODO: human review
    manhattanHeading: 'मैनहट्टन चार्ट (प्रति ओवर रन)', wormHeading: 'वर्म चार्ट (कुल स्कोर प्रगति)', // TODO: human review
    firstInningsDefault: 'पहली पारी', overByOverHeading: 'ओवर-दर-ओवर विवरण', overWord: 'ओवर', runsWord: 'रन', // TODO: human review
    generatingImage: 'छवि बनाई जा रही है...', savedPngImage: 'PNG छवि सहेजी गई', failedExportPng: 'छवि निर्यात करने में विफल।', // TODO: human review
    generatingPdf: 'PDF बनाया जा रहा है...', savedPdfDocument: 'PDF दस्तावेज़ सहेजा गया', failedExportPdf: 'PDF निर्यात करने में विफल।', // TODO: human review
    sharePdfBtn: 'PDF साझा करें', shareImageBtn: 'छवि साझा करें', shareTextBtn: 'टेक्स्ट साझा करें', retryBtn: 'पुनः प्रयास करें', // TODO: human review
    sharedSuccess: 'सफलतापूर्वक साझा किया गया', downloadedFallbackSuccess: 'फ़ाइल डाउनलोड की गई', copiedSummarySuccess: 'सारांश क्लिपबोर्ड पर कॉपी किया गया', // TODO: human review
    failedSharePdf: 'PDF साझा करने में विफल।', failedShareImage: 'छवि साझा करने में विफल।', failedShareText: 'टेक्स्ट साझा करने में विफल।', // TODO: human review
    tossWonByBatTpl: '{team} ने टॉस जीतकर बल्लेबाजी चुनी', // TODO: human review
    tossWonByBowlTpl: '{team} ने टॉस जीतकर गेंदबाजी चुनी', // TODO: human review
    pageOfTpl: 'पृष्ठ {page} / {total}', // TODO: human review
    cricsFooter: 'CRICS', // TODO: human review
    venuePrefix: 'मैदान', // TODO: human review
    datePrefix: 'तारीख', // TODO: human review
    tossPrefix: 'टॉस', // TODO: human review
    resultPrefix: 'परिणाम', // TODO: human review
  },
  players: {
    title: 'खिलाड़ी रजिस्ट्री', subtitle: 'खिलाड़ी प्रोफ़ाइल, फोटो, डुप्लिकेट जांच, CSV सिंक और QR कार्ड।', // TODO: human review
    registerBtn: 'खिलाड़ी जोड़ें', importCsv: 'CSV आयात', downloadCsv: 'CSV डाउनलोड', // TODO: human review
    searchPlaceholder: 'नाम, ID या जर्सी नंबर से खोजें...', careerStatsBtn: 'करियर आंकड़े', // TODO: human review
    csvPolicyAria: 'CSV डुप्लिकेट आईडी नीति', csvUpdateExisting: 'CSV डुप्लिकेट: मौजूदा अपडेट करें', // TODO: human review
    csvCreateNew: 'CSV डुप्लिकेट: नई आईडी बनाएं', csvSkip: 'CSV डुप्लिकेट: छोड़ें', // TODO: human review
    archivedToastSuffix: 'आर्काइव किया गया (मैच इतिहास सुरक्षित है)।', allRolesFilter: 'सभी', archivedBtnLabel: 'आर्काइव', // TODO: human review
    emptyMessage: 'कोई खिलाड़ी नहीं मिला। टीमें बनाना शुरू करने के लिए अपना पहला खिलाड़ी जोड़ें।', // TODO: human review
    archivedBadge: 'आर्काइव', bowlingLabel: 'गेंदबाजी', dobLabel: 'जन्मतिथि', squadsLabel: 'टीमें', // TODO: human review
    restoreBtn: 'पुनर्स्थापित करें', idCardAria: 'आईडी कार्ड:', autoPlayerIdLabel: 'ऑटो खिलाड़ी ID', // TODO: human review
    editModalTitle: 'खिलाड़ी प्रोफ़ाइल संपादित करें', registerModalTitle: 'नया खिलाड़ी पंजीकृत करें', // TODO: human review
    duplicateWarningTitle: 'डुप्लिकेट चेतावनी:', // TODO: human review
    duplicateWarningBody: 'समान नाम या जन्मतिथि वाले खिलाड़ी पहले से मौजूद हैं:', // TODO: human review
    duplicateWarningNote: 'यदि यह अलग व्यक्ति है तो आप फिर भी सहेज सकते हैं।', // TODO: human review
    fullNameLabel: 'पूरा नाम *', fullNamePlaceholder: 'जैसे आरव शर्मा', // TODO: human review
    dobOptionalLabel: 'जन्मतिथि (वैकल्पिक)', primaryRoleLabel: 'मुख्य भूमिका', // TODO: human review
    jerseyOptionalLabel: 'जर्सी नंबर (वैकल्पिक)', jerseyPlaceholder: 'असाइन नहीं किया गया', // TODO: human review
    battingStyleLabel: 'बल्लेबाजी शैली', bowlingStyleLabel: 'गेंदबाजी शैली', // TODO: human review
    phoneLabel: 'फ़ोन नंबर', phonePlaceholder: '+91 98201 00000', // TODO: human review
    photoLabel: 'खिलाड़ी का फोटो', changePhotoBtn: 'फोटो बदलें (तैयार)', uploadPhotoBtn: 'फोटो अपलोड करें', // TODO: human review
    notesLabel: 'नोट्स', notesPlaceholder: 'ताकत, पसंदीदा बल्लेबाजी क्रम, आदि।', savePlayerBtn: 'खिलाड़ी सहेजें', // TODO: human review
    archivePlayerTitle: 'खिलाड़ी रिकॉर्ड आर्काइव करें?', deletePlayerTitle: 'खिलाड़ी को स्थायी रूप से हटाएं?', // TODO: human review
    archivePlayerDesc: 'पुराने मैचों में शामिल है। स्कोरकार्ड और करियर आंकड़े सुरक्षित रखने के लिए इसे आर्काइव किया जाएगा।', // TODO: human review
    deletePlayerDescPrefix: 'क्या आप वाकई स्थायी रूप से हटाना चाहते हैं:', // TODO: human review
    deletePlayerDescSuffix: 'इस खिलाड़ी का कोई मैच रिकॉर्ड नहीं है और इसे सभी टीमों से हटा दिया जाएगा।', // TODO: human review
    archivePlayerConfirmBtn: 'खिलाड़ी आर्काइव करें', deletePlayerConfirmBtn: 'खिलाड़ी हटाएं', // TODO: human review
    officialPlayerPass: 'CRICS आधिकारिक खिलाड़ी पास', qrHeading: 'ऑफ़लाइन सत्यापन QR', // TODO: human review
    playerIdQrHeading: 'खिलाड़ी ID QR', // TODO: human review
    qrSub: 'खिलाड़ी ID और प्रोफ़ाइल सत्यापित करने के लिए स्कैन करें', qrAltPrefix: 'QR कोड:', savePngBtn: 'PNG सहेजें', printCardBtn: 'कार्ड प्रिंट करें', // TODO: human review
    sharePassBtn: 'पास साझा करें', printSheetBtn: 'शीट प्रिंट करें', exitPrintBtn: 'प्रिंट दृश्य बंद करें', // TODO: human review
    failedExportPass: 'खिलाड़ी पास निर्यात करने में विफल।', savedPassImage: 'खिलाड़ी पास PNG सहेजा गया', // TODO: human review
    exportRosterBtn: 'रोस्टर निर्यात करें', importRosterBtn: 'रोस्टर आयात करें', // TODO: human review
    rosterExportedStatus: 'क्लब सत्यापन रोस्टर JSON सहेजा गया।', // TODO: human review
    rosterImportedPrefix: 'आयातित', rosterImportedSuffix: 'खिलाड़ी सत्यापन रिकॉर्ड।', // TODO: human review
    rosterImportError: 'क्लब रोस्टर JSON फ़ाइल आयात नहीं हो सकी।', // TODO: human review
    doesNotBowl: 'गेंदबाजी नहीं करते', // TODO: human review
    couldNotCompressImageError: 'छवि संपीड़ित नहीं हो सकी।', // TODO: human review
    playerNameRequiredError: 'खिलाड़ी का नाम आवश्यक है।', // TODO: human review
    importedCsvPrefix: 'आयातित', // TODO: human review
    importedCsvMid: 'खिलाड़ी CSV से', // TODO: human review
  },
  teams: {
    title: 'टीम और स्क्वाड प्रबंधन', subtitle: 'क्लब, स्क्वाड, कप्तान और उप-कप्तान प्रबंधित करें।', // TODO: human review
    createBtn: 'नई टीम बनाएं', captain: 'कप्तान', viceCaptain: 'उप-कप्तान', // TODO: human review
    hideArchivedBtn: 'आर्काइव टीमें छिपाएं', showArchivedBtn: 'आर्काइव दिखाएं', // TODO: human review
    archivedToastSuffix: 'आर्काइव की गई (पुराने स्कोरकार्ड सुरक्षित हैं)।', // TODO: human review
    emptyMessage: 'अभी कोई टीम नहीं बनाई गई है। एक टीम बनाएं और अपने खिलाड़ी चुनें।', // TODO: human review
    archivedSuffix: '(आर्काइव)', squadMembersLabel: 'स्क्वाड सदस्य', // TODO: human review
    captShort: 'कप्तान', vcShort: 'उप-कप्तान', unassigned: 'कोई नहीं', viceCaptBadge: 'उप-कप्तान', // TODO: human review
    archiveTeamTitle: 'टीम आर्काइव करें?', deleteTeamTitle: 'टीम को स्थायी रूप से हटाएं?', // TODO: human review
    archiveTeamDesc: 'रिकॉर्ड किए गए मैचों या टूर्नामेंट में शामिल है। इसे आर्काइव किया जाएगा।', // TODO: human review
    deleteTeamDescPrefix: 'क्या आप वाकई स्थायी रूप से हटाना चाहते हैं:', // TODO: human review
    deleteTeamDescSuffix: 'इसके खिलाड़ी आपकी खिलाड़ी सूची में सुरक्षित रहेंगे।', // TODO: human review
    archiveTeamConfirmBtn: 'टीम आर्काइव करें', deleteTeamConfirmBtn: 'टीम हटाएं', // TODO: human review
    editModalTitle: 'टीम और स्क्वाड संपादित करें', createModalTitle: 'नई टीम बनाएं', // TODO: human review
    teamNameLabel: 'टीम का नाम *', teamNamePlaceholder: 'जैसे बैंगलोर स्ट्राइकर्स', // TODO: human review
    shortCodeLabel: 'संक्षिप्त कोड', shortCodePlaceholder: 'BS', // TODO: human review
    selectSquadLabel: 'स्क्वाड खिलाड़ी चुनें (एक खिलाड़ी कई टीमों में हो सकता है)', // TODO: human review
    selectCaptainOption: 'कप्तान चुनें', selectViceCaptainOption: 'उप-कप्तान चुनें', saveTeamBtn: 'टीम सहेजें', // TODO: human review
  },
  careers: {
    title: 'करियर प्रबंधन और विश्लेषण', subtitle: 'प्रारूप, सीज़न, टीम और विरोधी के अनुसार जीवनकाल आंकड़े।', // TODO: human review
    shareCardBtn: 'प्रोफ़ाइल कार्ड साझा करें', saveImageBtn: 'छवि सहेजें', potmHistoryTitle: 'प्लेयर ऑफ द मैच इतिहास', headToHeadTitle: 'बल्लेबाज बनाम गेंदबाज (Head-to-Head)', // TODO: human review
    noPlayersRegistered: 'कोई खिलाड़ी पंजीकृत नहीं है।', selectPlayerAria: 'खिलाड़ी करियर चुनें', // TODO: human review
    formatSplitLabel: 'प्रारूप फ़िल्टर', allFormatsOption: 'सभी प्रारूप', customFormatOption: 'कस्टम', // TODO: human review
    seasonSplitLabel: 'सीज़न फ़िल्टर', allSeasonsOption: 'सभी सीज़न', seasonPrefix: 'सीज़न', // TODO: human review
    playingForTeamLabel: 'टीम की ओर से', allTeamsOption: 'सभी टीमें', // TODO: human review
    vsOpponentLabel: 'विरोधी टीम', allOpponentsOption: 'सभी विरोधी', // TODO: human review
    matchesLabel: 'मैच', potmAwardsLabel: 'POTM पुरस्कार', defaultContenderBadge: 'सक्रिय स्क्वाड खिलाड़ी', // TODO: human review
    battingCareerHeading: 'बल्लेबाजी करियर', runsLabel: 'रन', hsLabel: 'सर्वोच्च', srLabel: 'स्ट्राइक रेट', // TODO: human review
    avgLabel: 'औसत', foursSixesLabel: 'चौके / छक्के', fiftiesHundredsLabel: '50 / 100', // TODO: human review
    thirtiesShort: '30s', fiftiesShort: '50s', hundredsShort: '100s', inningsLabel: 'पारियां', ducksLabel: 'डक्स (0)', // TODO: human review
    bowlingCareerHeading: 'गेंदबाजी करियर', wicketsLabel: 'विकेट', bestLabel: 'सर्वश्रेष्ठ', // TODO: human review
    econLabel: 'इकॉनमी', oversLabel: 'ओवर', fiveWHaulsLabel: '5 विकेट', hatTricksLabel: 'हैट्रिक', // TODO: human review
    fieldingImpactHeading: 'फील्डिंग और प्रभाव', catchesLabel: 'कैच', stumpingsLabel: 'स्टंपिंग', // TODO: human review
    runOutsLabel: 'रन आउट', threeWHaulsLabel: '3 विकेट', potmShortLabel: 'POTM', // TODO: human review
    h2hAsBatter: 'बल्लेबाज के रूप में', h2hAsBowler: 'गेंदबाज के रूप में', // TODO: human review
    h2hRunsConcededLabel: 'दिए गए रन', h2hBallsBowledLabel: 'फेंकी गई गेंदें', h2hWicketsTakenLabel: 'विकेट लिए', // TODO: human review
    recentFormHeading: 'हालिया फॉर्म ग्राफ (मैच के अनुसार रन और विकेट)', // TODO: human review
    runsScoredLabel: 'बनाए गए रन', ballsFacedLabel: 'खेली गई गेंदें', dismissalsLabel: 'आउट हुए', // TODO: human review
    strikeRateLabel: 'स्ट्राइक रेट', dotBallsLabel: 'डॉट गेंदें', noPotmAwards: 'इस फ़िल्टर में कोई प्लेयर ऑफ द मैच पुरस्कार नहीं है।', // TODO: human review
    failedExportProfileCard: 'प्रोफ़ाइल कार्ड निर्यात करने में विफल।', savedProfileCard: 'प्रोफ़ाइल कार्ड PNG सहेजा गया', // TODO: human review
    earnedBadgesLabel: 'अर्जित बैज', byEsportZignal: 'by eSportZignal', // TODO: human review
  },
  tournaments: {
    title: 'टूर्नामेंट और अंक तालिका', subtitle: 'लीग या ग्रुप चरण, फिक्स्चर, नेट रन रेट (NRR), नॉकआउट और शीर्ष खिलाड़ी।', // TODO: human review
    newTournamentBtn: 'नया टूर्नामेंट', standingsTitle: 'अंक तालिका और NRR', topPerformersTitle: 'शीर्ष प्रदर्शनकर्ता', // TODO: human review
    fixturesTitle: 'फिक्स्चर और परिणाम', addFixtureBtn: 'फिक्स्चर जोड़ें', knockoutTitle: 'नॉकआउट चरण और ब्रैकेट', // TODO: human review
    seedKnockoutBtn: 'नॉकआउट चरण तैयार करें', quarterFinals: 'क्वार्टर-फाइनल, सेमी-फाइनल और फाइनल', // TODO: human review
    semiFinals: 'सेमी-फाइनल और फाइनल', finalOnly: 'केवल फाइनल', customKnockout: 'कस्टम नॉकआउट', // TODO: human review
    markNoResultBtn: 'बेनतीजा (No Result) घोषित करें', noResultLabel: 'बेनतीजा', // TODO: human review
    seedsLabel: 'सीड्स', winnerLabel: 'विजेता', resumeScoringBtn: 'स्कोरिंग जारी रखें', viewScorecardBtn: 'स्कोरकार्ड देखें', // TODO: human review
    startFixtureBtn: 'मैच शुरू करें', selectTournamentAria: 'टूर्नामेंट चुनें', deleteTournamentAria: 'टूर्नामेंट हटाएं', // TODO: human review
    emptyMessage: 'अभी कोई टूर्नामेंट नहीं बनाया गया है। नया टूर्नामेंट शुरू करने के लिए बटन पर टैप करें।', // TODO: human review
    allGroupsFilter: 'सभी ग्रुप', posCol: 'स्थान', teamCol: 'टीम', playedCol: 'मैच', wonCol: 'जीत', // TODO: human review
    lostCol: 'हार', tiedCol: 'टाई', nrCol: 'बेनतीजा', ptsCol: 'अंक', nrrCol: 'NRR', // TODO: human review
    emptyKnockoutDesc: 'अभी कोई नॉकआउट ब्रैकेट तैयार नहीं हुआ है। अंक तालिका से नॉकआउट तैयार करें।', // TODO: human review
    leadingRunScorer: 'शीर्ष रन स्कोरर', noBattingRecords: 'इस टूर्नामेंट में अभी कोई बल्लेबाजी रिकॉर्ड नहीं है।', // TODO: human review
    leadingWicketTaker: 'शीर्ष विकेट लेने वाला', wktsShort: 'विकेट', noWicketsRecords: 'इस टूर्नामेंट में अभी कोई विकेट रिकॉर्ड नहीं है।', // TODO: human review
    deleteTournamentTitle: 'टूर्नामेंट हटाएं?', deleteTournamentConfirmPrefix: 'क्या आप वाकई हटाना चाहते हैं:', // TODO: human review
    roundStageLabel: 'राउंड / चरण का नाम', // TODO: human review
    seedKnockoutDesc: 'अंक तालिका से स्वचालित रूप से नॉकआउट मैच तैयार करें। मैच पूरा होने पर विजेता आगे बढ़ेंगे।', // TODO: human review
    knockoutStructureLabel: 'नॉकआउट संरचना', startDateLabel: 'प्रारंभ तिथि', // TODO: human review
    tournamentNameLabel: 'टूर्नामेंट का नाम *', tournamentNamePlaceholder: 'जैसे समर T20 ट्रॉफी', // TODO: human review
    defaultVenueLabel: 'मुख्य मैदान', structureLabel: 'प्रारूप संरचना', // TODO: human review
    roundRobinLeagueOption: 'राउंड-रॉबिन लीग', groupStageOption: 'ग्रुप चरण (ग्रुप A / B)', // TODO: human review
    knockoutStageLabel: 'नॉकआउट चरण', noneLeagueOnlyOption: 'कोई नहीं (केवल लीग)', // TODO: human review
    participatingTeamsLabel: 'भाग लेने वाली टीमें', selectedSuffix: 'चयनित', // TODO: human review
    groupAOption: 'ग्रुप A', groupBOption: 'ग्रुप B', createAndGenerateBtn: 'बनाएं और फिक्स्चर तैयार करें', // TODO: human review
    defaultVenueName: 'मुख्य मैदान', defaultFixtureRound: 'मैच', tbdLabel: 'तय होना बाकी', // TODO: human review
  },
  leaderboards: {
    title: 'क्लब लीडरबोर्ड', subtitle: 'रन, विकेट, स्ट्राइक रेट, इकॉनमी और कैच में शीर्ष खिलाड़ी।', // TODO: human review
    mostRuns: 'सर्वाधिक रन', mostWickets: 'सर्वाधिक विकेट', bestStrikeRate: 'सर्वश्रेष्ठ स्ट्राइक रेट', bestEconomy: 'सर्वश्रेष्ठ इकॉनमी', mostCatches: 'सर्वाधिक कैच', // TODO: human review
    filterFormatAria: 'प्रारूप द्वारा फ़िल्टर करें', filterSeasonAria: 'सीज़न द्वारा फ़िल्टर करें', // TODO: human review
    emptyMessage: 'इस फ़िल्टर के लिए अभी कोई खिलाड़ी आंकड़े रिकॉर्ड नहीं किए गए हैं।', // TODO: human review
    rankCol: 'रैंक', playerCol: 'खिलाड़ी', catchesRoCol: 'कैच/रन आउट', // TODO: human review
  },
  settings: {
    title: 'बैकअप, ऑफ़लाइन स्टोरेज और सेटिंग्स', subtitle: 'डेटा बैकअप और रिस्टोर, सैंपल डेटा, स्कोरर पिन, थीम और भाषा।', // TODO: human review
    backupHeader: 'वन-टैप ऑफ़लाइन बैकअप और रिस्टोर', exportJsonBtn: 'बैकअप फ़ाइल निर्यात करें', importJsonBtn: 'बैकअप फ़ाइल आयात करें', // TODO: human review
    themeHeader: 'थीम, भाषा और स्कोरिंग प्राथमिकताएं', systemTheme: 'सिस्टम', lightTheme: 'लाइट', darkTheme: 'डार्क', languageLabel: 'भाषा', // TODO: human review
    pinConvenienceNotice: 'नोट: यह पिन केवल गलती से बटन दबने से रोकने के लिए एक सुविधा लॉक है, यह एन्क्रिप्शन नहीं है।', // TODO: human review
    includePinInBackup: 'बैकअप फ़ाइल में स्कोरर लॉक पिन शामिल करें', checkForUpdateBtn: 'अपडेट की जांच करें', // TODO: human review
    upToDateStatus: 'आपके पास नवीनतम संस्करण स्थापित है।', updateReadyStatus: 'एक नया अपडेट इंस्टॉल करने के लिए तैयार है।', // TODO: human review
    rebuildCareerStatsBtn: 'करियर आंकड़े फिर से बनाएं', careerStatsRebuiltStatus: 'सभी मैचों से करियर आंकड़े फिर से तैयार किए गए।', // TODO: human review
    privacyPolicyLink: 'गोपनीयता नीति (Privacy Policy)', vibrationLabel: 'गेंद रिकॉर्ड होने पर कंपन (Vibrate) करें', // TODO: human review
    highContrastLabel: 'धूप में स्कोरिंग के लिए हाई कॉन्ट्रास्ट मोड', // TODO: human review
    storageUsedLabel: 'इस फ़ोन पर उपयोग किया गया स्टोरेज', matchesSinceBackupLabel: 'पिछले बैकअप के बाद के मैच', privacySectionTitle: 'आपका डेटा और गोपनीयता', // TODO: human review
    backupExportDesc: 'सभी खिलाड़ियों (फोटो सहित), टीमों, मैचों और टूर्नामेंट को एक बैकअप फ़ाइल में सहेजें।', // TODO: human review
    sampleDataTitle: 'सैंपल क्लब डेटा (डेमो रिकॉर्ड)', // TODO: human review
    sampleDataDesc: 'अपने खुद के रिकॉर्ड को प्रभावित किए बिना सैंपल खिलाड़ियों, टीमों और मैचों को लोड या हटाएं।', // TODO: human review
    removeSampleDataBtn: 'सैंपल डेटा हटाएं', offlineStorageProtection: 'ऑफ़लाइन स्टोरेज सुरक्षा', // TODO: human review
    storageProtected: 'सुरक्षित', storageActive: 'सक्रिय', // TODO: human review
    remindAfterEveryMatches: 'हर इतने मैचों के बाद बैकअप की याद दिलाएं', displayThemeLabel: 'डिस्प्ले थीम', // TODO: human review
    englishDefaultOption: 'English (Default)', hindiOption: 'हिन्दी (Hindi)', spanishOption: 'Español (Spanish)', // TODO: human review
    defaultMatchOversLabel: 'डिफ़ॉल्ट मैच ओवर', keepScreenAwakeLabel: 'लाइव मैच के दौरान स्क्रीन चालू रखें', // TODO: human review
    scorerLockPinTitle: 'स्कोरर लॉक पिन', pinActiveBadge: 'पिन सक्रिय', holdOnlyBadge: 'केवल होल्ड (कोई पिन नहीं)', // TODO: human review
    pinInputAria: '4-अंकीय स्कोरर लॉक पिन', pinInputPlaceholder: '4-अंकीय पिन', // TODO: human review
    updatePinBtn: 'पिन अपडेट करें', setPinBtn: '4-अंकीय पिन सेट करें', clearPinBtn: 'पिन हटाएं', // TODO: human review
    backupSizeExceededError: 'बैकअप फ़ाइल अधिकतम अनुमत आकार से बड़ी है।', invalidBackupError: 'अमान्य बैकअप फ़ाइल।', // TODO: human review
    appUpdatesLabel: 'ऐप अपडेट:', appUpdatesDesc: 'स्कोरिंग पूरी होने तक अपडेट प्रतीक्षा करते हैं।', // TODO: human review
    aboutAppTitle: 'CRICS Cricket Scorer के बारे में (v1.0.0)', htmlCopyLink: 'HTML कॉपी', // TODO: human review
    privacySummaryParagraph: 'CRICS आपके फ़ोन पर 100% ऑफ़लाइन काम करता है। आपके खिलाड़ी, फोटो, मैच या आंकड़े कभी किसी सर्वर पर नहीं भेजे जाते।', // TODO: human review
    removeSampleModalTitle: 'सैंपल डेटा हटाएं?', removeSampleModalPrefix: 'यह सभी', // TODO: human review
    removeSampleModalSuffix: 'सैंपल रिकॉर्ड हटा देगा। आपके द्वारा बनाए गए सभी रिकॉर्ड सुरक्षित रहेंगे।', // TODO: human review
    previewTitle: 'मान्य बैकअप पूर्वावलोकन', schemaPrefix: 'स्कीमा v', // TODO: human review
    newRecordsLabel: 'नए रिकॉर्ड', changedConflictsLabel: 'बदले हुए (संघर्ष)', unchangedLabel: 'अपरिवर्तित', // TODO: human review
    ballsLabel: 'गेंदें', toursLabel: 'टूर्नामेंट', mergeWithCurrent: 'वर्तमान डेटा के साथ मिलाएं', replaceAllExisting: 'सभी मौजूदा डेटा बदलें', // TODO: human review
    conflictPromptSuffix: 'रिकॉर्ड में अलग डेटा के साथ समान ID है। इसे कैसे हल करें?', // TODO: human review
    keepMine: 'मेरा रखें', keepImported: 'आयातित रखें', keepBoth: 'दोनों रखें (नई ID)', // TODO: human review
    replaceWarningPrefix: 'चेतावनी: रिप्लेस मोड सभी मौजूदा स्थानीय रिकॉर्ड हटा देगा', replaceWarningSuffix: 'आयात करने से पहले।', // TODO: human review
    downloadSafetyBackupBtn: 'पहले सुरक्षा बैकअप डाउनलोड करें', // TODO: human review
    confirmReplaceCheckbox: 'मैं समझता हूँ कि सभी मौजूदा रिकॉर्ड बदल दिए जाएंगे', confirmImportBtn: 'आयात की पुष्टि करें', // TODO: human review
    showIntroAnimationLabel: 'इंट्रो एनीमेशन दिखाएं', // TODO: human review
    guideLinksLabel: 'गाइड', aboutGuideLink: 'CRICS के बारे में', featuresGuideLink: 'विशेषताएँ', scoringGuideLink: 'स्कोर करना सीखें', faqGuideLink: 'अक्सर पूछे जाने वाले प्रश्न', // TODO: human review
    clubSecurityCodeTitle: 'क्लब सुरक्षा कोड (वैकल्पिक)', // TODO: human review
    clubSecurityCodeDesc: 'खिलाड़ी पास QR कोड को इस फ़ोन पर HMAC-SHA256 से साइन करता है ताकि पास ऑफ़लाइन सत्यापित हो सकें।', // TODO: human review
    clubSecurityCodeInputAria: 'क्लब सुरक्षा कोड', // TODO: human review
    clubSecurityCodePlaceholder: 'जैसे ROYALS-2026', // TODO: human review
    saveClubCodeBtn: 'कोड सहेजें', // TODO: human review
    clearClubCodeBtn: 'हटाएं', // TODO: human review
    clubCodeSavedStatus: 'खिलाड़ी पास QR साइनिंग के लिए क्लब सुरक्षा कोड सहेजा गया।', // TODO: human review
    clubCodeClearedStatus: 'क्लब सुरक्षा कोड हटाया गया। पास अब खिलाड़ी ID QR जांच का उपयोग करेंगे।', // TODO: human review
    clubCodeActiveBadge: 'HMAC सक्रिय', // TODO: human review
    clubCodeCrcBadge: 'केवल CRC ID', // TODO: human review
  },
  scanner: {
    title: 'खिलाड़ी पास स्कैन करें', // TODO: human review
    subtitle: 'कैमरा, QR फ़ोटो, कोड टाइप करके या क्लब रोस्टर JSON से ऑफ़लाइन खिलाड़ी पास सत्यापित करें।', // TODO: human review
    quickSubtitle: 'खिलाड़ी QR और ID सत्यापित करें', // TODO: human review
    scanPassBtn: 'खिलाड़ी पास स्कैन करें', // TODO: human review
    backToPlayersBtn: 'खिलाड़ियों पर वापस जाएं', // TODO: human review
    cameraSectionTitle: 'लाइव कैमरा स्कैनर', // TODO: human review
    startCameraBtn: 'कैमरा शुरू करें', // TODO: human review
    stopCameraBtn: 'कैमरा रोकें', // TODO: human review
    cameraPermissionDeniedHelp: 'कैमरा अनुमति अस्वीकार या ब्लॉक कर दी गई है। ब्राउज़र/डिवाइस सेटिंग्स में कैमरा अनुमति दें, या नीचे "QR की फ़ोटो चुनें" या "कोड टाइप करें" का उपयोग करें।', // TODO: human review
    cameraUnavailableHelp: 'इस ब्राउज़र या डिवाइस में लाइव कैमरा उपलब्ध नहीं है। नीचे "QR की फ़ोटो चुनें" या "कोड टाइप करें" का उपयोग करें।', // TODO: human review
    choosePhotoLabel: 'QR की फ़ोटो चुनें', // TODO: human review
    noQrFoundInPhoto: 'चयनित फ़ोटो में कोई पढ़ने योग्य QR कोड नहीं मिला। साफ़ फ़ोटो चुनें या कोड टाइप करें।', // TODO: human review
    photoDecodeError: 'चयनित छवि फ़ाइल पढ़ी नहीं जा सकी।', // TODO: human review
    typeCodeLabel: 'कोड टाइप करें', // TODO: human review
    typeCodePlaceholder: 'जैसे CRICS1.1001.18.ABCDEFGH', // TODO: human review
    verifyCodeBtn: 'कोड सत्यापित करें', // TODO: human review
    resultHeading: 'सत्यापन परिणाम', // TODO: human review
    statusGenuine: 'असली (Genuine)', // TODO: human review
    statusDetailsDiffer: 'मिला लेकिन विवरण अलग है', // TODO: human review
    statusNotCrics: 'CRICS कोड नहीं है', // TODO: human review
    statusNotFound: 'इस डिवाइस पर नहीं मिला', // TODO: human review
    genuineHmacDesc: 'क्लब HMAC-SHA256 हस्ताक्षर से चेक कोड सत्यापित हुआ।', // TODO: human review
    genuineCrcDesc: 'खिलाड़ी ID और CRC चेक कोड इस डिवाइस के रिकॉर्ड से मेल खाए।', // TODO: human review
    genuineRosterDesc: 'आयातित क्लब रोस्टर के विरुद्ध ऑफ़लाइन सत्यापित।', // TODO: human review
    detailsDifferDesc: 'खिलाड़ी रिकॉर्ड मिला, लेकिन जर्सी नंबर या सत्यापन चेक कोड मेल नहीं खाता।', // TODO: human review
    notCricsDesc: 'यह QR या टेक्स्ट मान्य CRICS1 खिलाड़ी पास कोड नहीं है।', // TODO: human review
    notFoundDesc: 'इस फ़ोन या आयातित क्लब रोस्टर में कोई मेल खाता खिलाड़ी नहीं मिला। ऑफ़लाइन सत्यापित करने के लिए क्लब रोस्टर JSON आयात करें।', // TODO: human review
    importRosterActionBtn: 'रोस्टर आयात करें', // TODO: human review
    exportRosterActionBtn: 'रोस्टर निर्यात करें', // TODO: human review
    rosterSummaryPrefix: 'आयातित ऑफ़लाइन रोस्टर:', // TODO: human review
    rosterSummarySuffix: 'खिलाड़ी रिकॉर्ड तैयार', // TODO: human review
    scannedCodeLabel: 'स्कैन किया गया कोड', // TODO: human review
    playerIdLabel: 'खिलाड़ी ID', // TODO: human review
    jerseyLabel: 'जर्सी', // TODO: human review
    scannedJerseyLabel: 'पास जर्सी', // TODO: human review
    storedJerseyLabel: 'सहेजी गई जर्सी', // TODO: human review
    sourceLocal: 'यह डिवाइस', // TODO: human review
    sourceRoster: 'आयातित रोस्टर', // TODO: human review
  },
  intro: {
    producedBy: 'द्वारा निर्मित', // TODO: human review
    createdBy: 'निर्माता', // TODO: human review
    skipBtn: 'छोड़ें', // TODO: human review
    screenReaderLabel: 'CRICS, produced by eSportZignal, created by LINGADASS K',
  },
  privacy: {
    title: 'गोपनीयता नीति (Privacy Policy)', subtitle: 'CRICS Cricket Scorer आपके डेटा को कैसे सुरक्षित रखता है।', // TODO: human review
    summaryHeading: '1. सारा डेटा आपके डिवाइस पर ही रहता है', // TODO: human review
    summaryBody: 'CRICS Cricket Scorer 100% ऑफ़लाइन काम करता है। सभी खिलाड़ी, फोटो, टीमें, मैच स्कोरकार्ड और टूर्नामेंट केवल आपके फ़ोन या डिवाइस पर सुरक्षित रहते हैं।', // TODO: human review
    zeroNetworkHeading: '2. कोई डेटा संग्रह नहीं, कोई खाता नहीं', // TODO: human review
    zeroNetworkBody: 'हम कोई भी व्यक्तिगत जानकारी या एनालिटिक्स एकत्र, साझा या बेचते नहीं हैं। ऐप में कोई खाता या इंटरनेट कॉल नहीं है।', // TODO: human review
    pinHeading: '3. स्कोरर लॉक पिन', // TODO: human review
    pinBody: 'स्कोरर पिन केवल गलती से बटन दबने से रोकने के लिए एक सुविधा लॉक है, यह एन्क्रिप्शन नहीं है।', // TODO: human review
    controlHeading: '4. आपका डेटा, आपका नियंत्रण', // TODO: human review
    controlBody: 'आप कभी भी सेटिंग्स से बैकअप फ़ाइल निर्यात कर सकते हैं या किसी भी रिकॉर्ड को हटा सकते हैं।', // TODO: human review
    backBtn: 'सेटिंग्स पर वापस जाएं', // TODO: human review
  },
};
