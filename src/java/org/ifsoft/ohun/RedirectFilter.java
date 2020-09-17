package org.ifsoft.ohun;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.*;
import javax.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.HashSet;
import java.util.Set;


public class RedirectFilter implements Filter
{
    private static final Logger Log = LoggerFactory.getLogger( RedirectFilter.class );

    private final Set<String> excludedExtensions = new HashSet<>();

    @Override
    public void init( FilterConfig filterConfig ) throws ServletException
    {
        excludedExtensions.clear();
        excludedExtensions.add( "png" );
        excludedExtensions.add( "gif" );
        excludedExtensions.add( "jpg" );
        excludedExtensions.add( "ico" );
        excludedExtensions.add( "css" );
        excludedExtensions.add( "json" );
        excludedExtensions.add( "jsp" );
        excludedExtensions.add( "js" );
    }

    protected boolean hasCorrectContext( HttpServletRequest request )
    {
        return request.getRequestURI().matches( request.getContextPath() + "/([^/]+)$" );
    }

    protected boolean containsExcludedExtension( HttpServletRequest request )
    {
        final String uri = request.getRequestURI().toLowerCase();
        for ( final String excludedExtension : excludedExtensions )
        {
            if ( uri.endsWith( "." + excludedExtension ) || uri.contains( "." + excludedExtension + "?" ) )
            {
                return true;
            }
        }

        if (uri.contains("/kraken")) return true;

        return false;
    }

    @Override
    public void doFilter( ServletRequest servletRequest, ServletResponse response, FilterChain filterChain ) throws IOException, ServletException
    {
        if ( servletRequest instanceof HttpServletRequest )
        {
            final HttpServletRequest request = (HttpServletRequest) servletRequest;
            if ( !hasCorrectContext( request ) )
            {
                Log.trace( "Not forwarding " + request.getRequestURI() + " (does not have correct context)." );
            }
            else if ( containsExcludedExtension( request ) )
            {
                Log.trace( "Not forwarding " + request.getRequestURI() + " (contains excluded extension)." );
            }
            else
            {
                Log.trace( "Forwarding " + request.getRequestURI() + " to /" );
                RequestDispatcher dispatcher = request.getRequestDispatcher( "/" );
                dispatcher.forward( request, response );
                return;
            }
        }
        filterChain.doFilter( servletRequest, response );
    }

    @Override
    public void destroy()
    {
    }
}
