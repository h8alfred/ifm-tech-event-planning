package com.ifm.tech.event_planning.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Configuration
public class ThreadPoolConfig {

    @Bean(destroyMethod = "shutdownNow")
    public ExecutorService validatorPool() {
        int poolSize = Math.max(2, Runtime.getRuntime().availableProcessors());
        return Executors.newFixedThreadPool(poolSize);
    }
}
