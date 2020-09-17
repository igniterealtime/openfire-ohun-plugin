<%@ page import="java.util.*" %>
<%@ page import="org.ifsoft.ohun.openfire.*" %>
<%@ page import="org.jivesoftware.openfire.*" %>
<%@ page import="org.jivesoftware.util.*" %>
<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>
<%

    boolean update = request.getParameter("update") != null;
    String errorMessage = null;

    // Get handle on the plugin
    Ohun plugin = (Ohun) XMPPServer.getInstance().getPluginManager().getPlugin("ohun");

    if (update)
    {            
        String port = request.getParameter("port");     
        JiveGlobals.setProperty("ohun.port", port);   
        
        String ipaddr = request.getParameter("ipaddr");     
        JiveGlobals.setProperty("ohun.ipaddr", ipaddr);   
        
        String network_interface = request.getParameter("network_interface");     
        JiveGlobals.setProperty("ohun.network_interface", network_interface);         
        
        String udp_min_port = request.getParameter("udp_min_port");          
        JiveGlobals.setProperty("ohun.udp_min_port", udp_min_port);  
        
        String udp_max_port = request.getParameter("udp_max_port");          
        JiveGlobals.setProperty("ohun.udp_max_port", udp_max_port);          
        
        String enabled = request.getParameter("enabled");
        JiveGlobals.setProperty("ohun.enabled", (enabled != null && enabled.equals("on")) ? "true": "false");        
    }

%>
<html>
<head>
   <title><fmt:message key="plugin.title.description" /></title>

   <meta name="pageID" content="ohun-settings"/>
</head>
<body>
<% if (errorMessage != null) { %>
<div class="error">
    <%= errorMessage%>
</div>
<br/>
<% } %>

<div class="jive-table">
<form action="ohun-settings.jsp" method="post">
    <p>
        <table class="jive-table" cellpadding="0" cellspacing="0" border="0" width="100%">
            <thead> 
            <tr>
                <th colspan="2"><fmt:message key="config.page.settings.description"/></th>
            </tr>
            </thead>
            <tbody>  
            <tr>
                <td nowrap  colspan="2">
                    <input type="checkbox" name="enabled"<%= (JiveGlobals.getProperty("ohun.enabled", "true").equals("true")) ? " checked" : "" %>>
                    <fmt:message key="config.page.configuration.enabled" />       
                </td>  
            </tr>                
            <tr>
                <td align="left" width="250">
                    <fmt:message key="config.page.configuration.network_interface"/>
                </td>
                <td><input type="text" size="50" maxlength="100" name="network_interface" required
                       value="<%= JiveGlobals.getProperty("ohun.network_interface", "eth0") %>">
                </td>                               
            </tr>  
            <tr>
                <td align="left" width="250">
                    <fmt:message key="config.page.configuration.port"/>
                </td>
                <td><input type="text" size="50" maxlength="100" name="port" required
                       value="<%= JiveGlobals.getProperty("ohun.port", plugin.getPort()) %>">
                </td>                               
            </tr>                
            <tr>
                <td align="left" width="250">
                    <fmt:message key="config.page.configuration.ipaddr"/>
                </td>
                <td><input type="text" size="50" maxlength="100" name="ipaddr"
                       value="<%= JiveGlobals.getProperty("ohun.ipaddr", plugin.getIpAddress()) %>">
                </td>                               
            </tr>             
            <tr>
                <td align="left" width="250">
                    <fmt:message key="config.page.configuration.udp.min.port"/>
                </td>
                <td><input type="text" size="50" maxlength="100" name="udp_min_port" 
                       value="<%= JiveGlobals.getProperty("ohun.udp_min_port", "26001") %>">
                </td>                               
            </tr>     
            <tr>
                <td align="left" width="250">
                    <fmt:message key="config.page.configuration.udp.max.port"/>
                </td>
                <td><input type="text" size="50" maxlength="100" name="udp_max_port" 
                       value="<%= JiveGlobals.getProperty("ohun.udp_max_port", "27000") %>">
                </td>                               
            </tr>              
            </tbody>
        </table>
    </p>
   <p>
        <table class="jive-table" cellpadding="0" cellspacing="0" border="0" width="100%">
            <thead> 
            <tr>
                <th colspan="2"><fmt:message key="config.page.configuration.save.title"/></th>
            </tr>
            </thead>
            <tbody>         
            <tr>
                <th colspan="2"><input type="submit" name="update" value="<fmt:message key="config.page.configuration.submit" />">&nbsp;&nbsp;<fmt:message key="config.page.configuration.restart.warning"/></th>
            </tr>       
            </tbody>            
        </table> 
    </p>
</form>
</div>
</body>
</html>
