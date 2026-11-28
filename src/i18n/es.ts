import type { EN_TRANSLATIONS } from './en';

// TODO: human review — Machine-translated Spanish dictionary for CRICS Cricket Scorer
export const ES_TRANSLATIONS: typeof EN_TRANSLATIONS = {
  appName: 'CRICS Cricket Scorer',
  tagline: 'Anotador de Cricket 100% Sin Conexión, Estadísticas y Torneos', // TODO: human review
  nav: {
    home: 'Panel', homeShort: 'Inicio', live: 'En Vivo', scorecards: 'Tarjetas', matches: 'Partidos', players: 'Jugadores', // TODO: human review
    teams: 'Equipos', careers: 'Carreras', stats: 'Estadísticas', tournaments: 'Torneos', leaderboards: 'Clasificación', // TODO: human review
    settings: 'Ajustes y Copia', newMatch: 'Nuevo Partido', scan: 'Escanear Pase', more: 'Más', skipToContent: 'Saltar al contenido principal', // TODO: human review
    loadingApp: 'Cargando tus registros de cricket sin conexión...', offlineBadge: 'Sin conexión', // TODO: human review
    desktopNavAria: 'Navegación Principal de Escritorio', mobileNavAria: 'Navegación Inferior Móvil', // TODO: human review
    leaveLiveTitle: '¿Salir de la Anotación en Vivo?', // TODO: human review
    leaveLiveDesc: 'Cada bola se guarda en tu dispositivo y puedes continuar cuando quieras, pero salir cerrará el teclado en vivo.', // TODO: human review
    stayOnLiveBtn: 'Quedarse en el Partido', leaveLiveBtn: 'Salir de la Vista', // TODO: human review
    errorEncountered: 'encontró un error', errorDefaultScope: 'Aplicación', // TODO: human review
    errorSafeNotice: 'Tus partidos y jugadores siguen guardados de forma segura en este teléfono. Puedes reintentar o exportar una copia de emergencia.', // TODO: human review
    retryViewBtn: 'Reintentar Vista', emergencyBackupBtn: 'Archivo de Copia de Emergencia', // TODO: human review
  },
  scoring: {
    striker: 'Bateador Activo', nonStriker: 'No Activo', bowler: 'Lanzador', swapStrike: 'Cambiar strike', // TODO: human review
    changeBowler: 'Cambiar Lanzador', retireReplace: 'Retirar / Sub', undo: 'Deshacer', redo: 'Rehacer', // TODO: human review
    editBall: 'Editar Bola', wicket: 'Wicket', wide: 'Wide', noBall: 'No Ball', bye: 'Bye', // TODO: human review
    legBye: 'Leg Bye', penalty: 'Penal', freeHitActive: 'TIRO LIBRE (FREE HIT)', // TODO: human review
    inningsBreak: 'Descanso de Entrada', startSecondInnings: 'Iniciar 2da Entrada', // TODO: human review
    startSuperOver: 'Iniciar Super Over', revisedTarget: 'Objetivo Revisado', target: 'Objetivo', // TODO: human review
    crr: 'CRR', rrr: 'RRR', thisOver: 'Este Over', partnership: 'Asociación', // TODO: human review
    lastWicket: 'Último Wkt', endInnings: 'Terminar Entrada', moreRuns: 'Más', highContrastBtn: 'Alto Contraste', // TODO: human review
    nbBat: 'NB + Bate', nbByes: 'NB + Byes', nbLegByes: 'NB + Leg-Byes', moreActions: 'Más acciones', // TODO: human review
    backBtn: 'Atrás', menuBtn: 'Menú', swapShort: 'Cambiar strike', bowlerShort: 'Lanzador', // TODO: human review
    retireShort: 'Retirar', editShort: 'Editar', // TODO: human review
    noActiveMatch: 'No hay ningún partido activo. Inicia un nuevo partido para comenzar a anotar.', // TODO: human review
    startNewMatchBtn: 'Iniciar Nuevo Partido', dismissBtn: 'Cerrar', runOutOnly: 'Solo Run Out', freeHitBadge: 'TIRO LIBRE', // TODO: human review
    liveScoreboardAria: 'Marcador en Vivo', vsShort: 'vs', needRuns: 'Faltan', inBalls: 'en', ballsSuffix: 'b', // TODO: human review
    switchMatchAria: 'Cambiar Partido', lockKeypadTitle: 'Bloquear o desbloquear teclado de anotación', // TODO: human review
    lockedBtn: 'Bloqueado', lockBtn: 'Bloquear', dlsShort: 'DLS', // TODO: human review
    highContrastAria: 'Alternar modo de alto contraste para sol', pshipShort: 'Asociación', zeroBalls: '0 bolas', // TODO: human review
    endOfOver: 'Fin del Over', nextBowlerPrompt: 'Siguiente lanzador', selectBowlerBtn: 'Elegir Lanzador', // TODO: human review
    oversHistoryAria: 'Historial de overs y pelotas', overAbbr: 'Ov', // TODO: human review
    keypadAria: 'Teclado de Anotación Bola por Bola', extraChooserAria: 'Selector de Carreras Extra', // TODO: human review
    tapRunsToRecord: 'Toca las carreras para anotar', cancelExtraAria: 'Cancelar selección de extra', // TODO: human review
    overthrowsChooserAria: 'Selector de Más Carreras', overthrowsTitle: 'Overthrows / Más Carreras', // TODO: human review
    runsUpper: 'CARR.', dotUpper: 'PUNTO', fourUpper: 'CUATRO', sixUpper: 'SEIS', wktShort: 'WKT', // TODO: human review
    recordWicketTitle: 'Registrar Wicket', freeHitDeliverySuffix: '(Tiro Libre)', // TODO: human review
    dismissalTypeLabel: 'Tipo de Eliminación', dismissedBatterLabel: 'Bateador Eliminado', // TODO: human review
    incomingBatterLabel: 'Nuevo Bateador', noneAllOut: 'Ninguno (Todos Eliminados)', // TODO: human review
    fielderKeeperLabel: 'Fildeador / Receptor', completedRunsLabel: 'Carreras Completadas', // TODO: human review
    newBatterEndLabel: 'Extremo del Nuevo Bateador', strikerEnd: 'Extremo Activo', nonStrikerEnd: 'Extremo No Activo', // TODO: human review
    confirmWicketBtn: 'Confirmar Wicket (WKT)', changeReasonLabel: 'Motivo del Cambio', // TODO: human review
    reasonEndOfOver: 'Fin del Over', reasonInjury: 'Lesión a Mitad del Over', reasonSuspension: 'Suspensión del Lanzador', // TODO: human review
    selectEligibleBowlerLabel: 'Elegir Lanzador Elegible', maxOversPrefix: 'Máx', oversWord: 'Overs', oversShort: 'ov', // TODO: human review
    maidensWord: 'Maidens', runsWord: 'Carreras', wicketsWord: 'Wickets', // TODO: human review
    invalidDeliveryError: 'Bola no válida.', invalidWicketError: 'Wicket no válido.', ineligibleBowlerError: 'Lanzador no elegible.', // TODO: human review
    ineligibleSuffix: 'No elegible', setBowlerBtn: 'Asignar Lanzador', // TODO: human review
    retireModalTitle: 'Retirar o Reemplazar Bateador', batterLeavingLabel: 'Bateador que Sale', // TODO: human review
    replacementBatterLabel: 'Bateador de Reemplazo', // TODO: human review
    retiredHurtCheckbox: 'Retirado Lesionado (No Eliminado — puede volver a batear)', confirmBtn: 'Confirmar', // TODO: human review
    wktBowled: 'Bowled (Boleado)', wktCaught: 'Caught (Atrapado)', wktLbw: 'LBW (Pierna Antes)', wktRunOut: 'Run Out', wktStumped: 'Stumped', // TODO: human review
    wktHitWicket: 'Hit Wicket', wktRetiredHurt: 'Retirado Lesionado (Puede Volver)', wktRetiredOut: 'Retirado Eliminado', // TODO: human review
    wktObstructing: 'Obstrucción del Campo', wktHitTwice: 'Golpear la Bola Dos Veces', wktTimedOut: 'Tiempo Agotado', // TODO: human review
    editBallModalTitle: 'Editar Bola Anterior', // TODO: human review
    selectDeliveryPrompt: 'Selecciona cualquier bola registrada para modificar sus carreras, extras o estado de wicket:', // TODO: human review
    seqPrefix: 'Sec #', innShort: 'Ent', editingSeqPrefix: 'Editando Secuencia de Bola #', inningsWord: 'Entrada', // TODO: human review
    runsOffBatLabel: 'Carreras de Bate', extraTypeLabel: 'Tipo de Extra', extraNone: 'Ninguno', // TODO: human review
    nbSecondaryLabel: 'Subtipo de No-Ball (Bate vs Byes/Leg-Byes)', // TODO: human review
    nbOffBatOption: 'De Bate (No-Ball Normal)', nbByesOption: 'No-Ball + Byes', nbLegByesOption: 'No-Ball + Leg-Byes', // TODO: human review
    extraRunsLabel: 'Carreras Extra', wicketOnBallCheckbox: 'Wicket en esta bola', // TODO: human review
    backToBallListBtn: 'Volver a la Lista', recalculateMatchBtn: 'Recalcular Partido', // TODO: human review
    revisedTargetModalTitle: 'Objetivo Manual / Revisado', // TODO: human review
    revisedTargetRunsLabel: 'Carreras Objetivo Revisadas', revisedMaxOversLabel: 'Overs Máximos Revisados', applyTargetBtn: 'Aplicar Objetivo', // TODO: human review
    matchCompletedTitle: 'Partido Completado', setupSecondInningsPrefix: 'Configurar 2da Entrada', chaseLabel: 'Persecución', // TODO: human review
    openingStrikerLabel: 'Bateador Inicial Activo', openingNonStrikerLabel: 'Bateador Inicial No Activo', openingBowlerLabel: 'Lanzador Inicial', // TODO: human review
    superOverTieBreaker: 'Desempate a 1 Over', startSuperOverChasePrefix: 'Iniciar Persecución Super Over', // TODO: human review
    undoLastBallBtn: 'Deshacer Última Bola', finalizeMatchBtn: 'Finalizar Resultado del Partido', // TODO: human review
    keypadLockedTitle: 'Teclado Bloqueado (Protección de Bolsillo)', accidentalTapsBlocked: 'Toques accidentales bloqueados', // TODO: human review
    keepHoldingUnlock: 'Mantén presionado para desbloquear', pressHoldUnlock: 'Mantén presionado (1.5s) para desbloquear', // TODO: human review
    enterScorerPinPlaceholder: 'O ingresa el PIN', scorerPinAria: 'PIN de Anotador', // TODO: human review
    unlockViaPinBtn: 'Desbloquear con PIN', incorrectPinError: 'PIN incorrecto.', // TODO: human review
    chaseNeedOneRunOneBall: '{team} necesita 1 carrera en 1 bola', // TODO: human review
    chaseNeedOneRunManyBalls: '{team} necesita 1 carrera en {balls} bolas', // TODO: human review
    chaseNeedManyRunsOneBall: '{team} necesita {runs} carreras en 1 bola', // TODO: human review
    chaseNeedManyRunsManyBalls: '{team} necesita {runs} carreras en {balls} bolas', // TODO: human review
    chaseStripOneRunOneBall: 'Falta 1 carrera en 1 bola', // TODO: human review
    chaseStripOneRunManyBalls: 'Falta 1 carrera en {balls} bolas', // TODO: human review
    chaseStripManyRunsOneBall: 'Faltan {runs} carreras en 1 bola', // TODO: human review
    chaseStripManyRunsManyBalls: 'Faltan {runs} carreras en {balls} bolas', // TODO: human review
    wonByOneRun: '{team} ganó por 1 carrera', // TODO: human review
    wonByManyRuns: '{team} ganó por {runs} carreras', // TODO: human review
    wonByOneWicket: '{team} ganó por 1 wicket', // TODO: human review
    wonByManyWickets: '{team} ganó por {wickets} wickets', // TODO: human review
    resultWonSuperOver: '{team} ganó en Super Over', // TODO: human review
    resultSuperOverTied: 'Super Over Empatado', // TODO: human review
    resultMatchTied: 'Partido Empatado — Super Over disponible', // TODO: human review
    resultNoResult: 'Partido Abandonado — Sin Resultado', // TODO: human review
    resultInningsBreakTarget: 'Descanso de Entrada — Objetivo {target}', // TODO: human review
    resultInProgress: 'Partido en curso', // TODO: human review
    last12Balls: 'Últimas 12 bolas', // TODO: human review
    noBallsYet: 'Sin bolas aún', // TODO: human review
    lastWicketNone: 'Ninguno', // TODO: human review
    confirmBowlerChanged: 'Lanzador cambiado', // TODO: human review
    confirmStrikeSwapped: 'Strike cambiado', // TODO: human review
    confirmBatterRetired: 'Bateador retirado', // TODO: human review
    confirmWicketRecorded: 'Wicket registrado', // TODO: human review
    confirmDotRecorded: 'Bola punto registrada', // TODO: human review
    confirmRunSingular: 'carrera', // TODO: human review
    confirmRunsPlural: 'carreras', // TODO: human review
    confirmRecordedSuffix: 'registrado', // TODO: human review
  },
  common: {
    save: 'Guardar', cancel: 'Cancelar', delete: 'Eliminar', edit: 'Editar', close: 'Cerrar', // TODO: human review
    exportPdf: 'Exportar PDF', exportPng: 'Exportar Imagen', share: 'Compartir', offlineReady: '100% Listo Sin Conexión', // TODO: human review
    backupReminder: 'Se recomienda guardar una copia de seguridad.', installApp: 'Instalar App', // TODO: human review
    updateNow: 'Actualizar ahora', loadingModule: 'Cargando...', undoAction: 'Deshacer', // TODO: human review
  },
  dashboard: {
    liveInProgress: 'PARTIDO EN VIVO EN CURSO', continueMatch: 'Continuar Partido', // TODO: human review
    readyHeading: 'Listo para Anotar tu Próximo Partido', // TODO: human review
    readySubtitle: 'Cada bola se guarda en tu dispositivo. Anota en un toque y sigue estadísticas sin conexión.', // TODO: human review
    quickCommandCenter: 'Acciones Rápidas', resumeScoring: 'Continuar Partido', viewLiveScorecard: 'Ver Tarjeta en Vivo', // TODO: human review
    recentMatches: 'Partidos Recientes', allScorecards: 'Todas las Tarjetas', registeredPlayers: 'Jugadores Registrados', // TODO: human review
    activeSquads: 'Equipos Activos', matchesRecorded: 'Partidos Grabados', ballEventsCount: 'Bolas Registradas', // TODO: human review
    lastBackupStatus: 'Última copia', backupNever: 'Nunca guardada', backupToday: 'Hoy', backupDaysAgo: 'días atrás', // TODO: human review
    firstRunTitle: 'Pasos iniciales', stepAddPlayers: '1. Añadir jugadores', stepCreateTeam: '2. Crear un equipo', stepStartMatch: '3. Iniciar un partido', // TODO: human review
    backupReminderAria: 'Recordatorio de Copia de Seguridad', backupNowBtn: 'Hacer Copia Ahora', // TODO: human review
    idCardsAndCsv: 'Tarjetas ID y CSV', backupAndRestore: 'Copia y Restauración', // TODO: human review
    installBannerText: 'Instala CRICS en tu pantalla de inicio para acceso instantáneo sin conexión', installOnIosBtn: 'Instalar en iOS', // TODO: human review
    noMatchesYet: 'Aún no hay partidos registrados. Configura tus equipos e inicia tu primer partido.', // TODO: human review
    scoreLiveBtn: 'Anotar en Vivo', scorecardBtn: 'Tarjeta', deleteMatchAria: 'Eliminar partido', // TODO: human review
    tournamentsAndCareerHub: 'Centro de Torneos y Carreras', manageBtn: 'Gestionar', // TODO: human review
    scheduledFixtures: 'Partidos Programados', officialNrrTable: 'Tabla NRR Oficial', // TODO: human review
    careerProfilesHeading: 'Perfiles de Carrera y Cara a Cara', // TODO: human review
    careerProfilesSub: 'Hitos históricos, curvas de forma y duelos bateador vs lanzador', // TODO: human review
    welcomeAria: 'Bienvenido a CRICS', welcomeHeading: 'Configura tu club en 3 pasos rápidos', // TODO: human review
    loadSampleDataBtn: 'Cargar Datos de Ejemplo', deleteMatchTitle: '¿Eliminar Partido Permanentemente?', // TODO: human review
    deleteMatchPrefix: 'Estás a punto de eliminar permanentemente', atWord: 'en', alongWithWord: 'junto con', // TODO: human review
    recordedBallsSuffix: 'bolas registradas', deleteMatchNotice: 'Las estadísticas de carrera y tablas de torneos se actualizarán de inmediato.', // TODO: human review
    deleteMatchConfirmBtn: 'Eliminar Partido y Bolas', iosGuideTitle: 'Instalar CRICS en iPhone / iPad', // TODO: human review
    iosGuideStep1: '1. Toca el botón Compartir en la barra de Safari.', iosGuideStep2: '2. Desplázate hacia abajo y toca Añadir a pantalla de inicio.', // TODO: human review
  },
  wizard: {
    title: 'Asistente de Configuración de Partido', subtitle: 'Configura equipos, XI inicial, sorteo, powerplays y reglas personalizadas.', // TODO: human review
    startMatchBtn: 'Iniciar Partido en Vivo', metadataSection: '01. Detalles y Sede del Partido', // TODO: human review
    rulesSection: '02. Overs, Powerplay y Reglas Extra', tossWonBy: 'Sorteo Ganado Por', tossDecision: 'Decisión del Sorteo', // TODO: human review
    step1Title: 'Paso 1: Detalles y Reglas', step2Title: 'Paso 2: Equipos y XI Inicial', step3Title: 'Paso 3: Sorteo y Abridores', // TODO: human review
    stepReady: 'Listo', stepCheck: 'Revisar', matchTitleLabel: 'Título del Partido', formatLabel: 'Formato', // TODO: human review
    formatT20Option: 'T20 (20 Overs)', formatT10Option: 'T10 (10 Overs)', formatOdiOption: 'Un Día (50 Overs)', formatCustomOption: 'Overs Personalizados', // TODO: human review
    tournamentOptionalLabel: 'Torneo (Opcional)', friendlyStandaloneOption: 'Partido Amistoso / Independiente', // TODO: human review
    linkFixtureLabel: 'Vincular Partido Programado del Torneo', adhocFixtureOption: 'Partido de Torneo Ad-hoc (Sin vínculo)', // TODO: human review
    venueLabel: 'Sede / Campo', dateLabel: 'Fecha', seasonLabel: 'Temporada', scorerNameLabel: 'Nombre del Anotador', // TODO: human review
    oversPerInningsLabel: 'Overs por Entrada', powerplayOversLabel: 'Overs de Powerplay', maxOversPerBowlerLabel: 'Máx Overs / Lanzador', // TODO: human review
    widePenaltyLabel: 'Carreras por Wide', noBallPenaltyLabel: 'Carreras por No-Ball', freeHitOnNoBallLabel: 'Tiro Libre en No-Ball', // TODO: human review
    electToBat: 'Elegir batear', electToBowl: 'Elegir lanzar', teamALabel: 'Equipo A', teamBLabel: 'Equipo B', // TODO: human review
    playingXiLabel: 'XI Inicial', selectTeamAria: 'Seleccionar', chooseAtLeast2Players: 'Elige al menos 2 jugadores para', // TODO: human review
    inOpposingXiSuffix: 'En el XI Rival', // TODO: human review
    sameTeamError: 'El Equipo A y el Equipo B no pueden ser el mismo. Elige dos equipos diferentes.', // TODO: human review
    openersSectionTitle: '03. Bateadores Iniciales y Lanzador Inicial', // TODO: human review
    differentOpenersError: 'Elige dos bateadores iniciales diferentes.', // TODO: human review
    openingStrikerLabel: 'Bateador Inicial Activo', openingNonStrikerLabel: 'Bateador Inicial No Activo', openingBowlerLabel: 'Lanzador Inicial', // TODO: human review
    defaultMatchTitle: 'Duelo de Campeonato del Club', defaultVenueName: 'Campo Principal', defaultScorerName: 'Anotador Oficial', // TODO: human review
    checkDetailsError: 'Por favor revisa los detalles del partido antes de iniciar.', // TODO: human review
  },
  scorecards: {
    title: 'Tarjetas de Puntuación Completas', subtitle: 'Tarjetas completas con bateo, lanzamiento, caída de wickets, asociaciones y gráficos.', // TODO: human review
    battingCard: 'Tarjeta de Bateo', bowlingCard: 'Tarjeta de Lanzamiento', fallOfWickets: 'Caída de Wickets', partnerships: 'Asociaciones', // TODO: human review
    manhattanChart: 'Manhattan', wormChart: 'Gráfico Worm', overLog: 'Registro Over por Over', potmLabel: 'Jugador del Partido', // TODO: human review
    emptyMessage: 'Aún no hay tarjetas disponibles. Inicia un partido para registrar bola por bola.', // TODO: human review
    selectMatchAria: 'Seleccionar Tarjeta de Partido', scorerLabel: 'Anotador', // TODO: human review
    potmManualSuffix: '(Manual)', potmAutoImpactSuffix: '(Impacto Auto)', potmAutoSuffix: '(Auto)', potmAutoCalculated: 'Calculado Automáticamente', // TODO: human review
    superOverLabel: 'Super Over', inningsLabel: 'Entrada', battingSuffix: 'Bateo', bowlingSuffix: 'Lanzamiento', // TODO: human review
    batterCol: 'Bateador', statusCol: 'Estado', runsCol: 'C', ballsCol: 'B', foursCol: '4s', sixesCol: '6s', srCol: 'SR', // TODO: human review
    extrasLabel: 'Extras', totalLabel: 'Total', oversLabel: 'Overs', didNotBatLabel: 'No Batearon:', // TODO: human review
    bowlerCol: 'Lanzador', oversCol: 'O', maidensCol: 'M', wicketsCol: 'W', econCol: 'ECON', // TODO: human review
    noWicketsFell: 'No cayeron wickets en esta entrada.', // TODO: human review
    manhattanHeading: 'Gráfico Manhattan (Carreras por Over)', wormHeading: 'Gráfico Worm (Progresión Acumulada)', // TODO: human review
    firstInningsDefault: '1ra Entrada', overByOverHeading: 'Desglose Over por Over', overWord: 'Over', runsWord: 'carreras', // TODO: human review
    generatingImage: 'Generando imagen...', savedPngImage: 'Imagen PNG guardada', failedExportPng: 'Error al exportar imagen.', // TODO: human review
    generatingPdf: 'Generando PDF...', savedPdfDocument: 'Documento PDF guardado', failedExportPdf: 'Error al exportar PDF.', // TODO: human review
    sharePdfBtn: 'Compartir PDF', shareImageBtn: 'Compartir imagen', shareTextBtn: 'Compartir texto', retryBtn: 'Reintentar', // TODO: human review
    sharedSuccess: 'Compartido con éxito', downloadedFallbackSuccess: 'Archivo descargado', copiedSummarySuccess: 'Resumen copiado al portapapeles', // TODO: human review
    failedSharePdf: 'Error al compartir PDF.', failedShareImage: 'Error al compartir imagen.', failedShareText: 'Error al compartir texto.', // TODO: human review
    tossWonByBatTpl: '{team} ganó el sorteo y eligió batear', // TODO: human review
    tossWonByBowlTpl: '{team} ganó el sorteo y eligió lanzar', // TODO: human review
    pageOfTpl: 'Página {page} de {total}', // TODO: human review
    cricsFooter: 'CRICS', // TODO: human review
    venuePrefix: 'Sede', // TODO: human review
    datePrefix: 'Fecha', // TODO: human review
    tossPrefix: 'Sorteo', // TODO: human review
    resultPrefix: 'Resultado', // TODO: human review
  },
  players: {
    title: 'Registro de Jugadores', subtitle: 'Perfiles, fotos, detección de duplicados, importar/exportar CSV y tarjetas QR.', // TODO: human review
    registerBtn: 'Registrar Jugador', importCsv: 'Importar CSV', downloadCsv: 'Descargar CSV', // TODO: human review
    searchPlaceholder: 'Buscar por nombre, ID o número de camiseta...', careerStatsBtn: 'Estadísticas de Carrera', // TODO: human review
    csvPolicyAria: 'Política de ID Duplicado CSV', csvUpdateExisting: 'Duplicados CSV: Actualizar Existente', // TODO: human review
    csvCreateNew: 'Duplicados CSV: Crear Nuevo ID', csvSkip: 'Duplicados CSV: Omitir Duplicado', // TODO: human review
    archivedToastSuffix: 'archivado (historial de partidos conservado).', allRolesFilter: 'TODOS', archivedBtnLabel: 'Archivados', // TODO: human review
    emptyMessage: 'No se encontraron jugadores. Añade tu primer jugador para crear equipos.', // TODO: human review
    archivedBadge: 'ARCHIVADO', bowlingLabel: 'Lanzamiento', dobLabel: 'F. Nac.', squadsLabel: 'Equipos', // TODO: human review
    restoreBtn: 'Restaurar', idCardAria: 'Tarjeta ID de', autoPlayerIdLabel: 'ID Automático', // TODO: human review
    editModalTitle: 'Editar Perfil de Jugador', registerModalTitle: 'Registrar Nuevo Jugador', // TODO: human review
    duplicateWarningTitle: 'Aviso de Duplicado:', // TODO: human review
    duplicateWarningBody: 'Ya existen jugadores con nombre o fecha similar:', // TODO: human review
    duplicateWarningNote: 'Aún puedes guardar si es una persona distinta.', // TODO: human review
    fullNameLabel: 'Nombre Completo *', fullNamePlaceholder: 'ej. Aarav Sharma', // TODO: human review
    dobOptionalLabel: 'Fecha de Nacimiento (Opcional)', primaryRoleLabel: 'Rol Principal', // TODO: human review
    jerseyOptionalLabel: 'Número de Camiseta (Opcional)', jerseyPlaceholder: 'Sin asignar', // TODO: human review
    battingStyleLabel: 'Estilo de Bateo', bowlingStyleLabel: 'Estilo de Lanzamiento', // TODO: human review
    phoneLabel: 'Teléfono', phonePlaceholder: '+91 98201 00000', // TODO: human review
    photoLabel: 'Foto del Jugador', changePhotoBtn: 'Cambiar Foto (Lista)', uploadPhotoBtn: 'Subir Foto', // TODO: human review
    notesLabel: 'Notas', notesPlaceholder: 'Fortalezas, posición preferida, etc.', savePlayerBtn: 'Guardar Jugador', // TODO: human review
    archivePlayerTitle: '¿Archivar Registro de Jugador?', deletePlayerTitle: '¿Eliminar Jugador Permanentemente?', // TODO: human review
    archivePlayerDesc: 'aparece en partidos históricos. Para proteger las tarjetas y estadísticas, este jugador será archivado.', // TODO: human review
    deletePlayerDescPrefix: '¿Seguro que deseas eliminar permanentemente a', // TODO: human review
    deletePlayerDescSuffix: 'Este jugador no tiene partidos registrados y será eliminado de todos los equipos.', // TODO: human review
    archivePlayerConfirmBtn: 'Archivar Jugador', deletePlayerConfirmBtn: 'Eliminar Jugador', // TODO: human review
    officialPlayerPass: 'PASE OFICIAL DE JUGADOR CRICS', qrHeading: 'QR de Verificación Sin Conexión', // TODO: human review
    playerIdQrHeading: 'QR de ID del Jugador', // TODO: human review
    qrSub: 'Escanea para verificar ID y perfil del jugador', qrAltPrefix: 'Código QR de', savePngBtn: 'Guardar PNG', printCardBtn: 'Imprimir Tarjeta', // TODO: human review
    sharePassBtn: 'Compartir Pase', printSheetBtn: 'Imprimir hoja', exitPrintBtn: 'Salir de Vista de Impresión', // TODO: human review
    failedExportPass: 'Error al exportar el pase de jugador.', savedPassImage: 'Pase de jugador PNG guardado', // TODO: human review
    exportRosterBtn: 'Exportar Lista', importRosterBtn: 'Importar Lista', // TODO: human review
    rosterExportedStatus: 'Archivo JSON de lista del club guardado.', // TODO: human review
    rosterImportedPrefix: 'Se importaron', rosterImportedSuffix: 'registro(s) de verificación de jugadores.', // TODO: human review
    rosterImportError: 'No se pudo importar el archivo JSON de lista del club.', // TODO: human review
    doesNotBowl: 'No lanza', // TODO: human review
    couldNotCompressImageError: 'No se pudo comprimir la imagen.', // TODO: human review
    playerNameRequiredError: 'Se requiere el nombre del jugador.', // TODO: human review
    importedCsvPrefix: 'Importados', // TODO: human review
    importedCsvMid: 'jugador(es) desde CSV', // TODO: human review
  },
  teams: {
    title: 'Gestión de Equipos y Plantillas', subtitle: 'Administra clubes, plantillas, capitanes y vicecapitanes.', // TODO: human review
    createBtn: 'Crear Equipo', captain: 'Capitán', viceCaptain: 'Vicecapitán', // TODO: human review
    hideArchivedBtn: 'Ocultar Equipos Archivados', showArchivedBtn: 'Mostrar Archivados', // TODO: human review
    archivedToastSuffix: 'archivado (tarjetas históricas conservadas).', // TODO: human review
    emptyMessage: 'Aún no hay equipos creados. Crea un equipo y elige a tus jugadores.', // TODO: human review
    archivedSuffix: '(Archivado)', squadMembersLabel: 'Miembros de Plantilla', // TODO: human review
    captShort: 'Cap', vcShort: 'VC', unassigned: 'Sin asignar', viceCaptBadge: 'Vicecap', // TODO: human review
    archiveTeamTitle: '¿Archivar Equipo?', deleteTeamTitle: '¿Eliminar Equipo Permanentemente?', // TODO: human review
    archiveTeamDesc: 'aparece en partidos o torneos registrados. Será archivado para conservar el historial.', // TODO: human review
    deleteTeamDescPrefix: '¿Seguro que deseas eliminar permanentemente a', // TODO: human review
    deleteTeamDescSuffix: 'Sus jugadores permanecerán en tu registro de jugadores.', // TODO: human review
    archiveTeamConfirmBtn: 'Archivar Equipo', deleteTeamConfirmBtn: 'Eliminar Equipo', // TODO: human review
    editModalTitle: 'Editar Equipo y Plantilla', createModalTitle: 'Crear Nuevo Equipo', // TODO: human review
    teamNameLabel: 'Nombre del Equipo *', teamNamePlaceholder: 'ej. Bangalore Strikers', // TODO: human review
    shortCodeLabel: 'Código Corto', shortCodePlaceholder: 'BS', // TODO: human review
    selectSquadLabel: 'Seleccionar Jugadores (Un jugador puede pertenecer a varios equipos)', // TODO: human review
    selectCaptainOption: 'Seleccionar Capitán', selectViceCaptainOption: 'Seleccionar Vicecapitán', saveTeamBtn: 'Guardar Equipo', // TODO: human review
  },
  careers: {
    title: 'Gestión y Análisis de Carrera', subtitle: 'Estadísticas vitalicias de bateo, lanzamiento y fildeo por formato, temporada y rival.', // TODO: human review
    shareCardBtn: 'Compartir tarjeta de perfil', saveImageBtn: 'Guardar imagen', potmHistoryTitle: 'Historial de Jugador del Partido', headToHeadTitle: 'Cara a Cara Bateador vs Lanzador', // TODO: human review
    noPlayersRegistered: 'No hay jugadores registrados.', selectPlayerAria: 'Seleccionar Carrera de Jugador', // TODO: human review
    formatSplitLabel: 'Filtro de Formato', allFormatsOption: 'Todos los Formatos', customFormatOption: 'Personalizado', // TODO: human review
    seasonSplitLabel: 'Filtro de Temporada', allSeasonsOption: 'Todas las Temporadas', seasonPrefix: 'Temporada', // TODO: human review
    playingForTeamLabel: 'Jugando Para', allTeamsOption: 'Todos los Equipos', // TODO: human review
    vsOpponentLabel: 'Contra Rival', allOpponentsOption: 'Todos los Rivales', // TODO: human review
    matchesLabel: 'Partidos', potmAwardsLabel: 'Premios POTM', defaultContenderBadge: 'Jugador Activo de Plantilla', // TODO: human review
    battingCareerHeading: 'Carrera de Bateo', runsLabel: 'Carreras', hsLabel: 'Máx', srLabel: 'SR', // TODO: human review
    avgLabel: 'Prom', foursSixesLabel: '4s / 6s', fiftiesHundredsLabel: '50 / 100', // TODO: human review
    thirtiesShort: '30s', fiftiesShort: '50s', hundredsShort: '100s', inningsLabel: 'Entradas', ducksLabel: 'Patos (0)', // TODO: human review
    bowlingCareerHeading: 'Carrera de Lanzamiento', wicketsLabel: 'Wickets', bestLabel: 'Mejor', // TODO: human review
    econLabel: 'Econ', oversLabel: 'Overs', fiveWHaulsLabel: '5 Wickets', hatTricksLabel: 'Hat-Tricks', // TODO: human review
    fieldingImpactHeading: 'Fildeo e Impacto', catchesLabel: 'Atrapadas', stumpingsLabel: 'Stumpings', // TODO: human review
    runOutsLabel: 'Run Outs', threeWHaulsLabel: '3 Wickets', potmShortLabel: 'POTM', // TODO: human review
    h2hAsBatter: 'Como bateador', h2hAsBowler: 'Como lanzador', // TODO: human review
    h2hRunsConcededLabel: 'Carreras Concedidas', h2hBallsBowledLabel: 'Bolas Lanzadas', h2hWicketsTakenLabel: 'Wickets', // TODO: human review
    recentFormHeading: 'Gráfico de Forma Reciente (Carreras y Wickets por Partido)', // TODO: human review
    runsScoredLabel: 'Carreras Anotadas', ballsFacedLabel: 'Bolas Enfrentadas', dismissalsLabel: 'Eliminaciones', // TODO: human review
    strikeRateLabel: 'Strike Rate', dotBallsLabel: 'Bolas Punto', noPotmAwards: 'Sin premios de Jugador del Partido en este filtro.', // TODO: human review
    failedExportProfileCard: 'Error al exportar la tarjeta de perfil.', savedProfileCard: 'Tarjeta de perfil PNG guardada', // TODO: human review
    earnedBadgesLabel: 'Insignias Obtenidas', byEsportZignal: 'by eSportZignal', // TODO: human review
  },
  tournaments: {
    title: 'Torneos y Tabla de Posiciones', subtitle: 'Fase de liga o grupos, calendario, tabla NRR oficial, eliminatorias y mejores jugadores.', // TODO: human review
    newTournamentBtn: 'Nuevo Torneo', standingsTitle: 'Clasificación y NRR', topPerformersTitle: 'Mejores del Torneo', // TODO: human review
    fixturesTitle: 'Partidos y Resultados', addFixtureBtn: 'Añadir Partido', knockoutTitle: 'Fase Eliminatoria y Cuadro', // TODO: human review
    seedKnockoutBtn: 'Generar Fase Eliminatoria', quarterFinals: 'Cuartos, Semifinales y Final', // TODO: human review
    semiFinals: 'Semifinales y Final', finalOnly: 'Solo Final', customKnockout: 'Eliminatoria Personalizada', // TODO: human review
    markNoResultBtn: 'Marcar Sin Resultado', noResultLabel: 'Sin Resultado', // TODO: human review
    seedsLabel: 'Cabezas de Serie', winnerLabel: 'Ganador', resumeScoringBtn: 'Reanudar Anotación', viewScorecardBtn: 'Ver Tarjeta', // TODO: human review
    startFixtureBtn: 'Iniciar Partido', selectTournamentAria: 'Seleccionar Torneo', deleteTournamentAria: 'Eliminar torneo', // TODO: human review
    emptyMessage: 'Aún no hay torneos creados. Toca Nuevo Torneo para configurar tu liga o fase de grupos.', // TODO: human review
    allGroupsFilter: 'Todos los Grupos', posCol: 'Pos', teamCol: 'Equipo', playedCol: 'PJ', wonCol: 'PG', // TODO: human review
    lostCol: 'PP', tiedCol: 'PE', nrCol: 'SR', ptsCol: 'Pts', nrrCol: 'NRR', // TODO: human review
    emptyKnockoutDesc: 'Aún no se ha generado el cuadro eliminatorio. Genera las eliminatorias desde la tabla de posiciones.', // TODO: human review
    leadingRunScorer: 'MÁXIMO ANOTADOR DE CARRERAS', noBattingRecords: 'Aún no hay registros de bateo en este torneo.', // TODO: human review
    leadingWicketTaker: 'MÁXIMO TOMADOR DE WICKETS', wktsShort: 'wkts', noWicketsRecords: 'Aún no hay wickets registrados en este torneo.', // TODO: human review
    deleteTournamentTitle: '¿Eliminar Torneo?', deleteTournamentConfirmPrefix: '¿Seguro que deseas eliminar', // TODO: human review
    roundStageLabel: 'Nombre de Ronda / Fase', // TODO: human review
    seedKnockoutDesc: 'Genera automáticamente los cruces eliminatorios según la tabla actual. Los ganadores avanzan automáticamente.', // TODO: human review
    knockoutStructureLabel: 'Estructura Eliminatoria', startDateLabel: 'Fecha de Inicio', // TODO: human review
    tournamentNameLabel: 'Nombre del Torneo *', tournamentNamePlaceholder: 'ej. Trofeo de Verano T20', // TODO: human review
    defaultVenueLabel: 'Sede Principal', structureLabel: 'Estructura', // TODO: human review
    roundRobinLeagueOption: 'Liga Todos contra Todos', groupStageOption: 'Fase de Grupos (Grupo A / B)', // TODO: human review
    knockoutStageLabel: 'Fase Eliminatoria', noneLeagueOnlyOption: 'Ninguna (Solo Liga)', // TODO: human review
    participatingTeamsLabel: 'Equipos Participantes', selectedSuffix: 'seleccionados', // TODO: human review
    groupAOption: 'Grupo A', groupBOption: 'Grupo B', createAndGenerateBtn: 'Crear y Generar Calendario', // TODO: human review
    defaultVenueName: 'Campo Principal', defaultFixtureRound: 'Partido', tbdLabel: 'Por definir', // TODO: human review
  },
  leaderboards: {
    title: 'Clasificación del Club', subtitle: 'Líderes en carreras, wickets, strike rate, economía y atrapadas.', // TODO: human review
    mostRuns: 'Más Carreras', mostWickets: 'Más Wickets', bestStrikeRate: 'Mejor Strike Rate', bestEconomy: 'Mejor Economía', mostCatches: 'Más Atrapadas', // TODO: human review
    filterFormatAria: 'Filtrar por formato', filterSeasonAria: 'Filtrar por temporada', // TODO: human review
    emptyMessage: 'Aún no hay estadísticas registradas para este filtro.', // TODO: human review
    rankCol: 'Pos', playerCol: 'Jugador', catchesRoCol: 'Atrapadas/RO', // TODO: human review
  },
  settings: {
    title: 'Copia de Seguridad, Almacenamiento y Ajustes', subtitle: 'Copia de seguridad, datos de ejemplo, PIN de bloqueo, tema e idioma.', // TODO: human review
    backupHeader: 'Copia de Seguridad y Restauración en Un Toque', exportJsonBtn: 'Exportar Copia de Seguridad', importJsonBtn: 'Importar Copia de Seguridad', // TODO: human review
    themeHeader: 'Tema, Idioma y Preferencias', systemTheme: 'Sistema', lightTheme: 'Claro', darkTheme: 'Oscuro', languageLabel: 'Idioma', // TODO: human review
    pinConvenienceNotice: 'Nota: Este PIN es un bloqueo de conveniencia para evitar toques accidentales y no es cifrado.', // TODO: human review
    includePinInBackup: 'Incluir el PIN de bloqueo en los archivos de copia de seguridad', checkForUpdateBtn: 'Buscar actualización', // TODO: human review
    upToDateStatus: 'Ya tienes instalada la versión más reciente.', updateReadyStatus: 'Una nueva actualización está lista para instalar.', // TODO: human review
    rebuildCareerStatsBtn: 'Reconstruir estadísticas de carrera', careerStatsRebuiltStatus: 'Estadísticas de carrera reconstruidas correctamente.', // TODO: human review
    privacyPolicyLink: 'Política de Privacidad', vibrationLabel: 'Vibrar al registrar cada bola', // TODO: human review
    highContrastLabel: 'Modo de alto contraste para luz solar al anotar', // TODO: human review
    storageUsedLabel: 'Almacenamiento usado en este teléfono', matchesSinceBackupLabel: 'Partidos desde la última copia', privacySectionTitle: 'Tus datos y privacidad', // TODO: human review
    backupExportDesc: 'Exporta todos los jugadores (con fotos), equipos, partidos y torneos en un solo archivo portátil.', // TODO: human review
    sampleDataTitle: 'Datos de Ejemplo del Club (Registros Demo)', // TODO: human review
    sampleDataDesc: 'Carga o elimina jugadores, equipos y partidos de ejemplo sin afectar tus propios registros.', // TODO: human review
    removeSampleDataBtn: 'Eliminar Datos de Ejemplo', offlineStorageProtection: 'Protección de Almacenamiento Local', // TODO: human review
    storageProtected: 'Protegido', storageActive: 'Activo', // TODO: human review
    remindAfterEveryMatches: 'Recordarme hacer copia después de cada (partidos)', displayThemeLabel: 'Tema de Pantalla', // TODO: human review
    englishDefaultOption: 'English (Default)', hindiOption: 'हिन्दी (Hindi)', spanishOption: 'Español (Spanish)', // TODO: human review
    defaultMatchOversLabel: 'Overs por Defecto', keepScreenAwakeLabel: 'Mantener Pantalla Encendida en Vivo', // TODO: human review
    scorerLockPinTitle: 'PIN de Bloqueo de Anotador', pinActiveBadge: 'PIN ACTIVO', holdOnlyBadge: 'SOLO MANTENER (Sin PIN)', // TODO: human review
    pinInputAria: 'PIN de bloqueo de 4 dígitos', pinInputPlaceholder: 'PIN de 4 dígitos', // TODO: human review
    updatePinBtn: 'Actualizar PIN', setPinBtn: 'Guardar PIN de 4 Dígitos', clearPinBtn: 'Borrar PIN', // TODO: human review
    backupSizeExceededError: 'El archivo de copia supera el tamaño máximo permitido.', invalidBackupError: 'Archivo de copia no válido.', // TODO: human review
    appUpdatesLabel: 'Actualizaciones:', appUpdatesDesc: 'Las actualizaciones esperan hasta que termines de anotar.', // TODO: human review
    aboutAppTitle: 'Acerca de CRICS Cricket Scorer (v1.0.0)', htmlCopyLink: 'Copia HTML', // TODO: human review
    privacySummaryParagraph: 'CRICS funciona 100% sin conexión en tu teléfono. Ninguno de tus jugadores, fotos, partidos o estadísticas se envía jamás a ningún servidor.', // TODO: human review
    removeSampleModalTitle: '¿Eliminar Datos de Ejemplo?', removeSampleModalPrefix: 'Esto eliminará los', // TODO: human review
    removeSampleModalSuffix: 'registros de ejemplo. Los jugadores, equipos o partidos que creaste se mantendrán intactos.', // TODO: human review
    previewTitle: 'Vista Previa de Copia Validada', schemaPrefix: 'Esquema v', // TODO: human review
    newRecordsLabel: 'Nuevos Registros', changedConflictsLabel: 'Modificados (Conflictos)', unchangedLabel: 'Sin Cambios', // TODO: human review
    ballsLabel: 'Bolas', toursLabel: 'Torneos', mergeWithCurrent: 'Combinar con datos actuales', replaceAllExisting: 'Reemplazar todos los datos existentes', // TODO: human review
    conflictPromptSuffix: 'registro(s) tienen el mismo ID con datos distintos. ¿Cómo resolver los conflictos?', // TODO: human review
    keepMine: 'Mantener los Míos', keepImported: 'Mantener Importados', keepBoth: 'Mantener Ambos (Nuevo ID)', // TODO: human review
    replaceWarningPrefix: 'Advertencia: El modo Reemplazar borrará todos los registros actuales', replaceWarningSuffix: 'antes de importar.', // TODO: human review
    downloadSafetyBackupBtn: 'Descargar Copia de Seguridad Primero', // TODO: human review
    confirmReplaceCheckbox: 'Entiendo que todos los registros locales existentes serán reemplazados', confirmImportBtn: 'Confirmar Importación', // TODO: human review
    showIntroAnimationLabel: 'Mostrar animación de introducción', // TODO: human review
    guideLinksLabel: 'Guías', aboutGuideLink: 'Acerca de CRICS', featuresGuideLink: 'Funciones', scoringGuideLink: 'Cómo anotar', faqGuideLink: 'Preguntas frecuentes', // TODO: human review
    clubSecurityCodeTitle: 'Código de Seguridad del Club (Opcional)', // TODO: human review
    clubSecurityCodeDesc: 'Firma los códigos QR del pase de jugador con HMAC-SHA256 en este teléfono para verificarlos sin conexión.', // TODO: human review
    clubSecurityCodeInputAria: 'Código de seguridad del club', // TODO: human review
    clubSecurityCodePlaceholder: 'ej. ROYALS-2026', // TODO: human review
    saveClubCodeBtn: 'Guardar Código', // TODO: human review
    clearClubCodeBtn: 'Borrar', // TODO: human review
    clubCodeSavedStatus: 'Código de seguridad del club guardado para firmar pases QR.', // TODO: human review
    clubCodeClearedStatus: 'Código de seguridad borrado. Los pases usarán verificación CRC de ID.', // TODO: human review
    clubCodeActiveBadge: 'HMAC ACTIVO', // TODO: human review
    clubCodeCrcBadge: 'SOLO CRC ID', // TODO: human review
  },
  scanner: {
    title: 'Escanear Pase de Jugador', // TODO: human review
    subtitle: 'Verifica pases sin conexión por cámara, foto del QR, código escrito o lista JSON del club.', // TODO: human review
    quickSubtitle: 'Verificar QR e ID del jugador', // TODO: human review
    scanPassBtn: 'Escanear pase de jugador', // TODO: human review
    backToPlayersBtn: 'Volver a Jugadores', // TODO: human review
    cameraSectionTitle: 'Escáner de Cámara en Vivo', // TODO: human review
    startCameraBtn: 'Iniciar Cámara', // TODO: human review
    stopCameraBtn: 'Detener Cámara', // TODO: human review
    cameraPermissionDeniedHelp: 'El permiso de cámara fue denegado o bloqueado. Habilita la cámara en ajustes o usa "Elegir una foto del QR" o "Escribir el código" abajo.', // TODO: human review
    cameraUnavailableHelp: 'La cámara en vivo no está disponible en este navegador o dispositivo. Usa "Elegir una foto del QR" o "Escribir el código" abajo.', // TODO: human review
    choosePhotoLabel: 'Elegir una foto del QR', // TODO: human review
    noQrFoundInPhoto: 'No se encontró ningún código QR legible en la foto. Prueba con una imagen más nítida o escribe el código.', // TODO: human review
    photoDecodeError: 'No se pudo leer el archivo de imagen seleccionado.', // TODO: human review
    typeCodeLabel: 'Escribir el código', // TODO: human review
    typeCodePlaceholder: 'ej. CRICS1.1001.18.ABCDEFGH', // TODO: human review
    verifyCodeBtn: 'Verificar Código', // TODO: human review
    resultHeading: 'Resultado de Verificación', // TODO: human review
    statusGenuine: 'Auténtico', // TODO: human review
    statusDetailsDiffer: 'Encontrado pero los datos difieren', // TODO: human review
    statusNotCrics: 'No es un código CRICS', // TODO: human review
    statusNotFound: 'No encontrado en este dispositivo', // TODO: human review
    genuineHmacDesc: 'Código verificado con firma HMAC-SHA256 del club.', // TODO: human review
    genuineCrcDesc: 'ID del jugador y código CRC coinciden con este dispositivo.', // TODO: human review
    genuineRosterDesc: 'Pase verificado sin conexión con la lista del club importada.', // TODO: human review
    detailsDifferDesc: 'Se encontró al jugador, pero el dorsal o el código de verificación no coinciden.', // TODO: human review
    notCricsDesc: 'Este QR o texto no es un código de pase CRICS1 válido.', // TODO: human review
    notFoundDesc: 'No hay un jugador coincidente en este teléfono ni en la lista importada. Importa el archivo JSON de lista del club.', // TODO: human review
    importRosterActionBtn: 'Importar lista', // TODO: human review
    exportRosterActionBtn: 'Exportar lista', // TODO: human review
    rosterSummaryPrefix: 'Lista sin conexión importada:', // TODO: human review
    rosterSummarySuffix: 'jugador(es) listos', // TODO: human review
    scannedCodeLabel: 'Código Escaneado', // TODO: human review
    playerIdLabel: 'ID del Jugador', // TODO: human review
    jerseyLabel: 'Camiseta', // TODO: human review
    scannedJerseyLabel: 'Camiseta en Pase', // TODO: human review
    storedJerseyLabel: 'Camiseta Guardada', // TODO: human review
    sourceLocal: 'Este Dispositivo', // TODO: human review
    sourceRoster: 'Lista Importada', // TODO: human review
  },
  intro: {
    producedBy: 'Producido por', // TODO: human review
    createdBy: 'Creado por', // TODO: human review
    skipBtn: 'Omitir', // TODO: human review
    screenReaderLabel: 'CRICS, produced by eSportZignal, created by LINGADASS K',
  },
  privacy: {
    title: 'Política de Privacidad', subtitle: 'Cómo protege tus datos CRICS Cricket Scorer.', // TODO: human review
    summaryHeading: '1. Todos los Datos Permanecen en tu Dispositivo', // TODO: human review
    summaryBody: 'CRICS Cricket Scorer funciona 100% sin conexión. Todos los jugadores, fotos, equipos, partidos, estadísticas y torneos se guardan únicamente en tu propio dispositivo.', // TODO: human review
    zeroNetworkHeading: '2. Sin Recopilación de Datos ni Cuentas', // TODO: human review
    zeroNetworkBody: 'No recopilamos, enviamos, vendemos ni compartimos datos personales ni analíticas. No hay cuentas de usuario, anuncios ni llamadas de red.', // TODO: human review
    pinHeading: '3. PIN de Bloqueo', // TODO: human review
    pinBody: 'El PIN de 4 dígitos es un bloqueo de conveniencia para evitar toques accidentales y no es cifrado.', // TODO: human review
    controlHeading: '4. Tus Datos, Tu Control', // TODO: human review
    controlBody: 'Puedes exportar una copia de seguridad en cualquier momento o eliminar cualquier registro desde la aplicación.', // TODO: human review
    backBtn: 'Volver a Ajustes', // TODO: human review
  },
};
