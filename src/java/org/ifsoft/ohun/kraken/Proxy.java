package org.ifsoft.ohun.kraken;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import javax.xml.bind.DatatypeConverter;

import org.apache.http.*;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.entity.ByteArrayEntity;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.impl.client.DefaultHttpClient;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.jivesoftware.util.JiveGlobals;
import org.jivesoftware.openfire.http.HttpBindManager;
import org.jivesoftware.openfire.sasl.AnonymousSaslServer;
import org.jivesoftware.openfire.auth.AuthFactory;
import org.jivesoftware.openfire.auth.UnauthorizedException;

public class Proxy extends HttpServlet
{
    private static final Logger Log = LoggerFactory.getLogger(Proxy.class);

    public void doPost( HttpServletRequest request, HttpServletResponse response )
    {
        boolean anonLogin = AnonymousSaslServer.ENABLED.getValue();

        if (!anonLogin)
        {
            String auth = request.getHeader("authorization");

            if (auth == null) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }

            auth = auth.replaceFirst("[B|b]asic ", "");
            byte[] decodedBytes = DatatypeConverter.parseBase64Binary(auth);

            if (decodedBytes == null || decodedBytes.length == 0) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                return;
            }
            try {
                String[] usernameAndPassword = new String(decodedBytes).split(":", 2);
                AuthFactory.authenticate(usernameAndPassword[0], usernameAndPassword[1]);

            } catch (UnauthorizedException e) {
                response.setStatus(HttpServletResponse. SC_UNAUTHORIZED);
                return;

            } catch (Exception e) {
                Log.error("Proxy - doPost", e);
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                return;
            }
        }

        try {
            String body = request.getReader().lines().collect(Collectors.joining());
            Log.info("HTTP Payload\n" + body);

            HttpClient client = new DefaultHttpClient();
            HttpPost post = new HttpPost("http://" + JiveGlobals.getProperty("ohun.ipaddr", "127.0.0.1") + ":" + JiveGlobals.getProperty("ohun.port", "7000"));

            post.setHeader("Content-Type", "application/json");
            HttpEntity entity = new ByteArrayEntity(body.getBytes("UTF-8"));
            post.setEntity(entity);

            HttpResponse response2 = client.execute(post);
            BufferedReader rd = new BufferedReader(new InputStreamReader(response2.getEntity().getContent()));

            ServletOutputStream out = response.getOutputStream();
            writeHeader(response);

            String line;
            while ((line = rd.readLine()) != null) {
                out.println(line);
            }

            response.setStatus(HttpServletResponse.SC_ACCEPTED);

        } catch (Exception e) {
            Log.error("Proxy - doPost", e);
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }

    private void writeHeader(HttpServletResponse response)
    {
        try {
            HttpBindManager boshManager = HttpBindManager.getInstance();

            response.setHeader("Access-Control-Allow-Origin", boshManager.getCORSAllowOrigin());
            response.setHeader("Access-Control-Allow-Headers", HttpBindManager.HTTP_BIND_CORS_ALLOW_HEADERS_DEFAULT + ", Authorization");
            response.setHeader("Access-Control-Allow-Credentials", "true");
            response.setHeader("Access-Control-Allow-Methods", HttpBindManager.HTTP_BIND_CORS_ALLOW_METHODS_DEFAULT);
            response.setHeader("Content-Type", "application/json");
        }
        catch(Exception e)
        {
            Log.error("writeHeader", e);
        }
    }
}