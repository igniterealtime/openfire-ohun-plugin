/*
 * Copyright (C) 2005-2010 Jive Software. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.ifsoft.ohun.openfire;

import java.io.File;
import java.net.*;
import java.util.concurrent.*;
import java.util.*;
import java.util.function.*;
import java.util.stream.*;
import java.nio.file.*;
import java.nio.charset.Charset;

import org.jivesoftware.openfire.container.Plugin;
import org.jivesoftware.openfire.container.PluginManager;
import org.jivesoftware.openfire.http.HttpBindManager;
import org.jivesoftware.openfire.XMPPServer;
import org.jivesoftware.openfire.sasl.AnonymousSaslServer;
import org.jivesoftware.openfire.muc.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.jivesoftware.util.JiveGlobals;
import org.jivesoftware.util.PropertyEventDispatcher;
import org.jivesoftware.util.PropertyEventListener;

import org.eclipse.jetty.apache.jsp.JettyJasperInitializer;
import org.eclipse.jetty.plus.annotation.ContainerInitializer;
import org.eclipse.jetty.server.handler.ContextHandlerCollection;
import org.eclipse.jetty.proxy.ProxyServlet;
import org.eclipse.jetty.servlets.*;
import org.eclipse.jetty.servlet.*;
import org.eclipse.jetty.webapp.WebAppContext;

import org.eclipse.jetty.util.security.*;
import org.eclipse.jetty.security.*;
import org.eclipse.jetty.security.authentication.*;

import org.apache.tomcat.InstanceManager;
import org.apache.tomcat.SimpleInstanceManager;
import org.eclipse.jetty.util.security.*;
import org.eclipse.jetty.security.*;
import org.eclipse.jetty.security.authentication.*;

import java.lang.reflect.*;
import java.util.*;

import org.jitsi.util.OSUtils;
import de.mxro.process.*;
import org.xmpp.packet.*;


public class Ohun implements Plugin, PropertyEventListener, ProcessListener, MUCEventListener
{
    private static final Logger Log = LoggerFactory.getLogger(Ohun.class);
    private XProcess krakenThread = null;
    private String krakenExePath = null;
    private String ohunHomePath = null;
    private ExecutorService executor;
    private WebAppContext publicWebApp;

    public void destroyPlugin()
    {
        PropertyEventDispatcher.removeListener(this);
        MUCEventDispatcher.removeListener(this);

        try {
            if (executor != null)  executor.shutdown();
            if (krakenThread != null) krakenThread.destory();
            if (publicWebApp != null) HttpBindManager.getInstance().removeJettyHandler(publicWebApp);

        }
        catch (Exception e) {
            Log.error("Ohun destroyPlugin", e);
        }
    }

    public void initializePlugin(final PluginManager manager, final File pluginDirectory)
    {
        PropertyEventDispatcher.addListener(this);
        MUCEventDispatcher.addListener(this);

        checkNatives(pluginDirectory);
        executor = Executors.newCachedThreadPool();
        startGoProcesses(pluginDirectory);
    }

    public String getPort()
    {
        return "7000";
    }

    public String getIpAddress()
    {
        String ourHostname = XMPPServer.getInstance().getServerInfo().getHostname();
        String ourIpAddress = "127.0.0.1";

        try {
            ourIpAddress = InetAddress.getByName(ourHostname).getHostAddress();
        } catch (Exception e) {

        }

        return ourIpAddress;
    }

    public void onOutputLine(final String line)
    {
        Log.info("onOutputLine " + line);
    }

    public void onProcessQuit(int code)
    {
        Log.info("onProcessQuit " + code);
    }

    public void onOutputClosed() {
        Log.error("onOutputClosed");
    }

    public void onErrorLine(final String line)
    {
        Log.debug(line);
    }

    public void onError(final Throwable t)
    {
        Log.error("Thread error", t);
    }

    private void startGoProcesses(final File pluginDirectory)
    {
        boolean krakenEnabled = JiveGlobals.getBooleanProperty("ohun.server.enabled", true);

        if (krakenExePath != null && krakenEnabled)
        {
            krakenThread = Spawn.startProcess(krakenExePath + " -c " + ohunHomePath + File.separator + "config/engine.toml -s engine", new File(ohunHomePath), this);
            Log.info("Ohun server enabled " + krakenExePath);

            publicWebApp = new WebAppContext(null, pluginDirectory.getPath() + "/classes/client",  "/ohun");
            publicWebApp.setClassLoader(this.getClass().getClassLoader());
            publicWebApp.getMimeTypes().addMimeMapping("wasm", "application/wasm");

            boolean anonLogin = AnonymousSaslServer.ENABLED.getValue();

            if (!anonLogin)
            {
                SecurityHandler securityHandler = basicAuth("ohun");
                publicWebApp.setSecurityHandler(securityHandler);
            }

            final List<ContainerInitializer> initializers4 = new ArrayList<>();
            initializers4.add(new ContainerInitializer(new JettyJasperInitializer(), null));
            publicWebApp.setAttribute("org.eclipse.jetty.containerInitializers", initializers4);
            publicWebApp.setAttribute(InstanceManager.class.getName(), new SimpleInstanceManager());

            Log.info("Ohun web client enabled");
            HttpBindManager.getInstance().addJettyHandler(publicWebApp);

        } else {
            Log.info("Ohun disabled");
        }
    }

    private void checkNatives(File pluginDirectory)
    {
        try
        {
            ohunHomePath = pluginDirectory.getAbsolutePath() + File.separator + "classes" + File.separator + "server";

            if(OSUtils.IS_LINUX64)
            {
                krakenExePath = ohunHomePath + File.separator + "kraken";
                makeFileExecutable(krakenExePath);
                createConfigFile();
            }
            else if(OSUtils.IS_WINDOWS64)
            {
                krakenExePath = ohunHomePath + File.separator + "kraken.exe";
                makeFileExecutable(krakenExePath);
                createConfigFile();

            } else {
                Log.error("checkNatives unknown OS " + pluginDirectory.getAbsolutePath());
            }
        }
        catch (Exception e)
        {
            Log.error("checkNatives error", e);
        }
    }

    private void makeFileExecutable(String path)
    {
        File file = new File(path);
        file.setReadable(true, true);
        file.setWritable(true, true);
        file.setExecutable(true, true);
        Log.info("checkNatives ohun executable path " + path);
    }

    private void createConfigFile()
    {
        List<String> lines = Arrays.asList(
            "[engine]",
            "interface = \"" + JiveGlobals.getProperty("ohun.network_interface", "eth0") + "\"",
            "log-level = 10",
            "address = \"" + JiveGlobals.getProperty("ohun.ipaddr", getIpAddress()) + "\"",
            "port-min = " + JiveGlobals.getProperty("ohun.port.min", "26001"),
            "port-max = " + JiveGlobals.getProperty("ohun.port.min", "27000"),
            "[turn]",
            "host = \"\"",
            "secret = \"\"",
            "[rpc]",
            "port = " + JiveGlobals.getProperty("ohun.port", getPort())
        );

        try
        {
            Path file = Paths.get(ohunHomePath + File.separator + "config" + File.separator + "engine.toml");
            Files.write(file, lines, Charset.forName("UTF-8"));
        } catch (Exception e) {
            Log.error("createConfigFile error", e);
        }
    }

    private static final SecurityHandler basicAuth(String realm) {

        OhunLoginService l = new OhunLoginService(realm);
        Constraint constraint = new Constraint();
        constraint.setName(Constraint.__BASIC_AUTH);
        constraint.setRoles(new String[]{realm, "webapp-owner", "webapp-contributor"});
        constraint.setAuthenticate(true);

        ConstraintMapping cm = new ConstraintMapping();
        cm.setConstraint(constraint);
        cm.setPathSpec("/*");

        ConstraintSecurityHandler csh = new ConstraintSecurityHandler();
        csh.setAuthenticator(new BasicAuthenticator());
        csh.setRealmName(realm);
        csh.addConstraintMapping(cm);
        csh.setLoginService(l);

        return csh;
    }

    // -------------------------------------------------------
    //
    //  MUCEventListener
    //
    // -------------------------------------------------------

    public void roomCreated(JID roomJID)
    {

    }

    public void roomDestroyed(JID roomJID)
    {

    }

    public void occupantJoined(JID roomJID, JID user, String nickname)
    {

    }

    public void occupantLeft(JID roomJID, JID user)
    {

    }

    public void nicknameChanged(JID roomJID, JID user, String oldNickname, String newNickname)
    {

    }

    public void messageReceived(JID roomJID, JID user, String nickname, Message message)
    {

    }

    public void roomSubjectChanged(JID roomJID, JID user, String newSubject)
    {

    }

    public void privateMessageRecieved(JID a, JID b, Message message)
    {

    }
    //-------------------------------------------------------
    //
    //  PropertyEventListener
    //
    //-------------------------------------------------------


    public void propertySet(String property, Map params)
    {

    }

    public void propertyDeleted(String property, Map<String, Object> params)
    {

    }

    public void xmlPropertySet(String property, Map<String, Object> params) {

    }

    public void xmlPropertyDeleted(String property, Map<String, Object> params) {

    }

}