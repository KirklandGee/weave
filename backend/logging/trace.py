import functools
import inspect
from contextlib import contextmanager

try:
    from langfuse import get_client
    langfuse = get_client()
except ImportError:
    langfuse = None

@contextmanager
def trace_span(name, **kwargs):
    if langfuse:
        print(f'TRACING {name}')
        for k, v in kwargs.items():
            print(f'  {k}: {v}')
        # Will replace with real tracing at some point, but for now just going to print. 
        # with langfuse.start_as_current_span(name=name, **kwargs) as span:
        #     yield span
    else:
        yield None

def traced(name=None, **span_kwargs):
    def decorator(func):
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            span_name = name or func.__name__
            with trace_span(span_name, **span_kwargs) as span:
                try:
                    result = func(*args, **kwargs)
                    if span:
                        span.update(output=repr(result))
                    return result
                except Exception as e:
                    if span:
                        span.update(error=str(e))
                    raise

        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            span_name = name or func.__name__
            with trace_span(span_name, **span_kwargs) as span:
                try:
                    result = await func(*args, **kwargs)
                    if span:
                        span.update(output=repr(result))
                    return result
                except Exception as e:
                    if span:
                        span.update(error=str(e))
                    raise

        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    return decorator