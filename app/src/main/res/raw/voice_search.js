(() => {
    'use strict';

    if (window.__liteSpeechRecognitionInstalled) return;
    window.__liteSpeechRecognitionInstalled = true;

    function log() {
        if (typeof console !== 'undefined' && console.log) {
            try {
                console.log.apply(console, ['[voice]'].concat(Array.prototype.slice.call(arguments)));
            } catch (error) { /* ignore */ }
        }
    }

    function notify(message) {
        log(message);
        if (typeof lite !== 'undefined' && lite.voiceLog) {
            try {
                lite.voiceLog(String(message));
            } catch (error) { /* ignore */ }
        }
    }

    let installAttempts = 0;
    function notifyInstalled() {
        if (installAttempts++ > 8) return;
        if (typeof lite !== 'undefined' && lite.voiceLog) {
            try {
                lite.voiceLog('polyfill installed');
            } catch (error) { /* ignore */ }
            return;
        }
        setTimeout(notifyInstalled, 500);
    }

    function makeResultEvent(text, isFinal) {
        const result = {
            isFinal: !!isFinal,
            length: 1,
            0: { transcript: String(text), confidence: 0.9 }
        };
        return {
            resultIndex: 0,
            length: 1,
            results: [result]
        };
    }

    let current = null;

    function emit(type, event) {
        const rec = current;
        if (!rec || !rec._active) return;
        const handler = rec[type];
        if (typeof handler === 'function') {
            try {
                handler.call(rec, event);
            } catch (error) { /* ignore */ }
        }
    }

    function fireStart() {
        const rec = current;
        if (rec) rec._started = true;
        emit('onaudiostart', {});
        emit('onsoundstart', {});
        emit('onspeechstart', {});
        emit('onstart', {});
    }

    function fireEnd() {
        const rec = current;
        if (!rec) return;
        emit('onspeechend', {});
        emit('onsoundend', {});
        emit('onaudioend', {});
        emit('onend', {});
        rec._active = false;
        rec._started = false;
        if (current === rec) current = null;
    }

    window.__liteSpeechDispatch = function (type, payload) {
        payload = payload || {};
        if (type === 'result' || type === 'error' || type === 'start' || type === 'end') {
            notify('event ' + type + (payload.text ? ': ' + payload.text : '') + (payload.error ? ' err=' + payload.error : ''));
        }
        switch (type) {
            case 'start':
                fireStart();
                break;
            case 'interim':
                if (payload.text) emit('onresult', makeResultEvent(payload.text, false));
                break;
            case 'result':
                if (payload.text) emit('onresult', makeResultEvent(payload.text, true));
                break;
            case 'error':
                emit('onerror', { error: payload.error || 'aborted' });
                break;
            case 'end':
                fireEnd();
                break;
        }
    };

    class LiteSpeechRecognition {
        constructor() {
            this.lang = '';
            this.continuous = false;
            this.interimResults = false;
            this.maxAlternatives = 1;
            this.onstart = null;
            this.onend = null;
            this.onerror = null;
            this.onresult = null;
            this.onnomatch = null;
            this.onaudiostart = null;
            this.onaudioend = null;
            this.onsoundstart = null;
            this.onsoundend = null;
            this.onspeechstart = null;
            this.onspeechend = null;
            this._active = false;
            this._started = false;
        }

        start() {
            notify('start called lang=' + (this.lang || '') + ' lite=' + typeof lite);
            if (this._started) {
                throw new DOMException('Failed to execute \'start\' on \'SpeechRecognition\': recognition has already started.');
            }
            if (current && current !== this) {
                current._active = false;
                current._started = false;
            }
            const rec = this;
            rec._active = true;
            rec._started = true;
            current = rec;
            try {
                if (typeof lite !== 'undefined' && lite.startVoiceRecognition) {
                    lite.startVoiceRecognition(rec.lang || '');
                    return;
                }
            } catch (error) { /* fall through to error path */ }
            notify('no native bridge, erroring');
            emit('onerror', { error: 'service-not-allowed' });
            fireEnd();
        }

        stop() {
            if (!this._active) return;
            try {
                if (typeof lite !== 'undefined' && lite.stopVoiceRecognition) {
                    lite.stopVoiceRecognition();
                }
            } catch (error) { /* ignore */ }
        }

        abort() {
            if (!this._active) return;
            try {
                if (typeof lite !== 'undefined' && lite.cancelVoiceRecognition) {
                    lite.cancelVoiceRecognition();
                }
            } catch (error) { /* ignore */ }
            fireEnd();
        }
    }

    notifyInstalled();
    window.SpeechRecognition = LiteSpeechRecognition;
    window.webkitSpeechRecognition = LiteSpeechRecognition;
})();
