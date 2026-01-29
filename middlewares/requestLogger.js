import logger from '../logger/logger.js';

const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    
    // Log request
    logger.info(`${req.method} ${req.path} - IP: ${req.ip || req.connection.remoteAddress}`, {
        method: req.method,
        path: req.path,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        userId: req.user?.id || 'anonymous'
    });

    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
        
        logger[logLevel](`${req.method} ${req.path} - Status: ${res.statusCode} - Duration: ${duration}ms`, {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip || req.connection.remoteAddress,
            userId: req.user?.id || 'anonymous'
        });
    });

    next();
};

export default requestLogger;
