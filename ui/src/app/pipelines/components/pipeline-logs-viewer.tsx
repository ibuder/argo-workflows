import * as React from 'react';
import {useEffect, useState} from 'react';
import {Observable} from 'rxjs';
import {ErrorNotice} from '../../shared/components/error-notice';
import {services} from '../../shared/services';
import {FullHeightLogsViewer} from '../../workflows/components/workflow-logs-viewer/full-height-logs-viewer';

function identity<T>(value: T) {
    return () => value;
}

export const PipelineLogsViewer = ({namespace, pipelineName, stepName}: {namespace: string; pipelineName: string; stepName: string}) => {
    const [container, setContainer] = useState<string>('main');
    const [error, setError] = useState<Error>();
    const [grep, setGrep] = useState('');
    const [logsObservable, setLogsObservable] = useState<Observable<string>>();
    const [logLoaded, setLogLoaded] = useState(false);
    // filter allows us to introduce a short delay, before we actually change grep
    const [filter, setFilter] = useState('');
    useEffect(() => {
        const x = setTimeout(() => setGrep(filter), 1000);
        return () => clearTimeout(x);
    }, [filter]);

    useEffect(() => {
        setError(null);
        setLogLoaded(false);
        const source = services.pipeline
            .pipelineLogs(namespace, pipelineName, stepName, container, grep, 50)
            .filter(e => !!e)
            .map(e => e.msg + '\n')
            // this next line highlights the search term in bold with a yellow background, white text
            .map(x => x.replace(new RegExp(grep, 'g'), y => '\u001b[1m\u001b[43;1m\u001b[37m' + y + '\u001b[0m'))
            .publishReplay()
            .refCount();
        const subscription = source.subscribe(() => setLogLoaded(true), setError);
        setLogsObservable(source);
        return () => subscription.unsubscribe();
    }, [namespace, pipelineName, stepName, container, grep]);

    return (
        <div>
            <div className='row'>
                <div className='columns small-3 medium-2'>
                    <p>Container</p>
                    <div style={{marginBottom: '1em'}}>
                        {['init', 'main', 'sidecar'].map(x => (
                            <div key={x}>
                                <a onClick={() => setContainer(x)}>
                                    {x === container ? <i className='fa fa-angle-right' /> : <span>&nbsp;&nbsp;</span>} {x}
                                </a>
                            </div>
                        ))}
                    </div>
                    <ErrorNotice error={error} />
                </div>
                <div className='columns small-9 medium-10'>
                    <p>
                        <span className='fa-pull-right'>
                            <i className='fa fa-filter' /> <input type='search' defaultValue={filter} onChange={v => setFilter(v.target.value)} placeholder='Filter (regexp)...' />
                        </span>
                    </p>
                    {!logLoaded ? (
                        <p>
                            <i className='fa fa-circle-notch fa-spin' /> Waiting for data...
                        </p>
                    ) : (
                        <FullHeightLogsViewer
                            source={{
                                key: 'logs',
                                loadLogs: identity(logsObservable),
                                shouldRepeat: () => false
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
